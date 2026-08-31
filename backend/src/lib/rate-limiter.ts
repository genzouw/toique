import { logger } from './logger.js';

/**
 * プロセスメモリ内の簡易レート制限。
 *
 * 単一 Bun プロセスでの運用を前提とする。複数ワーカー/プロセス/コンテナに
 * スケールする構成に変更する場合は、共有TTLストア (Redis 等) とアトミックな
 * 更新に置き換えること（同一キーの履歴を実行単位間で共有するため）。
 *
 * ## 挿入順の不変条件
 *
 * バケットの Map 挿入順は「最後にタイムスタンプを追加した時刻 (= lastTimestamp)」の
 * 昇順に保たれている。バケット位置の更新を record()（= タイムスタンプ追加時）に限り、
 * isLimited() による判定では位置を更新しないことで維持している。
 *
 * バケットの期限切れ時刻は lastTimestamp + windowMs で決まるので、
 * 「先頭バケット = 最も早く期限切れになるバケット」が常に成立する。
 * したがって期限切れバケットが1件でも存在すれば必ず先頭にあり、
 * 走査上限に依存せず O(1) で期限切れを優先削除できる。
 *
 * この不変条件を守らず「判定のたびに位置を末尾へ動かす (touch)」実装にすると、
 * lastTimestamp が古いままのバケットが末尾へ逃げ、evict 時に期限切れバケットでは
 * なく有効なバケットが削除される。攻撃者は多数の別キーでバケットを埋めるだけで
 * 制限を回避できてしまう。
 *
 * なお touch には「制限中の攻撃者が自分のバケットを evict させて履歴をリセットする」
 * 経路を塞ぐ意図もあったが、この設計では成立しにくい。制限に達した直後のバケットは
 * 最も新しい lastTimestamp を持つため Map の最後尾にあり、evict の先頭ポインタが
 * そこへ到達するには maxBuckets 件ぶんの新規キーが要る。IP をキーにする場合、
 * clientIp は XFF の右端を採るため偽装では増やせず、実 IP を maxBuckets 件用意
 * できる攻撃者はそもそも各 IP から上限まで普通に送れる。得られるのは自然な
 * 期限切れの数分の前倒しに過ぎず、期限切れバケットを検出できなくなる損失のほうが
 * 大きい。したがって本実装では touch を行わない。
 */

/** 飽和 warn の間引き間隔（飽和時に毎回出すとログが溢れるため） */
const SATURATION_WARN_INTERVAL_MS = 60 * 1000;

const DEFAULT_MAX_BUCKETS = 10000;

export type RateLimiterOptions = {
  /** 集計ウィンドウ (ms) */
  windowMs: number;
  /** ウィンドウ内に許容する件数。0 以下なら常に制限扱い */
  max: number;
  /** メモリ使用量を制限し OOM DoS を防ぐためのバケット数上限 */
  maxBuckets?: number;
  /** 指定した場合、この間隔で期限切れバケットを定期スイープする */
  sweepIntervalMs?: number;
  /** ログ出力時の識別名 */
  name?: string;
};

export type RateLimiter = {
  /** 状態を変えずに、キーが現在制限中かを判定する */
  isLimited(key: string): boolean;
  /** タイムスタンプを1件記録する（バケットは末尾へ移動する） */
  record(key: string): void;
  /** 制限中なら true を返し、そうでなければ1件記録して false を返す */
  consume(key: string): boolean;
  /** 単一キーの履歴を破棄する（認証成功時など） */
  clear(key: string): void;
  /** 全キーの履歴を破棄する（テスト用の唯一の入口） */
  reset(): void;
  /** 期限切れバケットを手動でスイープする */
  sweep(): void;
  readonly size: number;
};

/**
 * リミッタ1個ぶんの内部状態。
 *
 * 各操作をクロージャではなくモジュールスコープの関数として実装し、
 * この state を明示的に受け渡すことで、ファクトリ関数を薄く保つ。
 */
type LimiterState = {
  readonly buckets: Map<string, number[]>;
  readonly windowMs: number;
  readonly max: number;
  readonly maxBuckets: number;
  readonly name: string;
  droppedActiveBuckets: number;
  lastSaturationWarnAt: number;
};

/** ソート済み配列の先頭から期限切れエントリ数をカウント */
function countExpired(history: number[], windowStart: number): number {
  let count = 0;
  while (count < history.length && history[count] <= windowStart) {
    count++;
  }
  return count;
}

/**
 * 期限切れタイムスタンプを取り除く。挿入順は意図的に更新しない
 * （更新すると上記の不変条件が壊れる）。
 */
function prune(
  state: LimiterState,
  key: string,
  now: number,
): number[] | undefined {
  const history = state.buckets.get(key);
  if (!history) return undefined;

  const expiredCount = countExpired(history, now - state.windowMs);
  if (expiredCount > 0) history.splice(0, expiredCount);

  if (history.length === 0) {
    state.buckets.delete(key);
    return undefined;
  }
  return history;
}

/**
 * 有効なバケットを捨てた = レート制限テーブルが飽和し、正規利用者のカウンタが
 * 意図せずリセットされたことを意味する。本番で「レート制限が効いていない」事象が
 * 起きたときに飽和が原因かを切り分けられるよう、必ず記録に残す。
 */
function reportSaturation(state: LimiterState, now: number): void {
  state.droppedActiveBuckets++;
  if (now - state.lastSaturationWarnAt < SATURATION_WARN_INTERVAL_MS) return;

  state.lastSaturationWarnAt = now;
  logger.warn('rate limiter saturated: evicted active bucket', {
    name: state.name,
    size: state.buckets.size,
    droppedActiveBuckets: state.droppedActiveBuckets,
  });
  state.droppedActiveBuckets = 0;
}

/**
 * maxBuckets 到達時に1件 evict する。挿入順の不変条件により、期限切れバケットが
 * 存在すれば必ず先頭にあるため、先頭を落とすだけで期限切れを優先削除できる。
 * 期限切れが1件も無い場合は、残り有効期間が最短のバケットを落とすことになる。
 */
function evictOldest(state: LimiterState, now: number): void {
  const windowStart = now - state.windowMs;
  let evictedCount = 0;

  // 挿入順の不変条件により、先頭から連続して期限切れのバケットが存在する。
  // それらをまとめて evict し、キャッシュ溢れ攻撃を防ぐ。1回の呼び出しで
  // 最大 maxBuckets 件を同期的に削除しうるため、呼び出し単位のレイテンシが
  // O(1) というわけではない。エントリ1件あたり生涯で1回しか削除処理を
  // 受けない、という意味で償却 O(1) である。
  for (const [key, history] of state.buckets) {
    const lastTimestamp = history[history.length - 1];
    if (lastTimestamp !== undefined && lastTimestamp > windowStart) {
      break; // アクティブなバケットに到達したらスイープ終了
    }
    state.buckets.delete(key);
    evictedCount++;
  }

  // 期限切れが1件も無かった場合はキャッシュ飽和状態なので、
  // やむを得ず先頭（＝最も古い）のアクティブバケットを1つ落として枠を空ける。
  //
  // 残存リスク: このフォールバックは、上の一括削除が防いだ「期限切れゴミの
  // 蓄積によるバイパス」とは異なる攻撃（ウィンドウ内に一度も期限切れを
  // 挟まず maxBuckets 件超の"アクティブな"別キーを送り続ける）に対しては
  // 無力で、他者のアクティブなバケットを evict しうる。ただし key は実IP
  // （clientIp は XFF の右端を採用するため偽装不可。冒頭コメント参照）なので、
  // 悪用には maxBuckets 件規模の実IPを同時稼働させる大規模ボットネットが
  // 必要になる。そのレベルの攻撃者は本経路を使わずとも直接送信で制限を
  // 圧倒できるため、この残存リスクは許容する（reportSaturation で可視化はする）。
  if (evictedCount === 0) {
    const entry = state.buckets.entries().next().value;
    if (entry) {
      reportSaturation(state, now);
      state.buckets.delete(entry[0]);
    }
  }
}

function sweep(state: LimiterState): void {
  const windowStart = Date.now() - state.windowMs;
  for (const [key, history] of state.buckets) {
    const expiredCount = countExpired(history, windowStart);
    if (expiredCount === history.length) {
      state.buckets.delete(key);
    } else if (expiredCount > 0) {
      history.splice(0, expiredCount);
    }
  }
}

function isLimited(state: LimiterState, key: string): boolean {
  if (state.max <= 0) return true;
  const history = prune(state, key, Date.now());
  return history !== undefined && history.length >= state.max;
}

function record(state: LimiterState, key: string): void {
  const now = Date.now();
  const history = prune(state, key, now);

  if (!history) {
    if (state.buckets.size >= state.maxBuckets) evictOldest(state, now);
    state.buckets.set(key, [now]);
    return;
  }

  // タイムスタンプ追加と同時にバケットを末尾へ移動し、
  // 「挿入順 = lastTimestamp 昇順」の不変条件を維持する。
  state.buckets.delete(key);
  state.buckets.set(key, history);
  history.push(now);
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const state: LimiterState = {
    buckets: new Map<string, number[]>(),
    windowMs: options.windowMs,
    max: options.max,
    maxBuckets: options.maxBuckets ?? DEFAULT_MAX_BUCKETS,
    name: options.name ?? 'rate-limiter',
    droppedActiveBuckets: 0,
    lastSaturationWarnAt: 0,
  };

  if (options.sweepIntervalMs !== undefined) {
    setInterval(() => sweep(state), options.sweepIntervalMs).unref();
  }

  return {
    isLimited(key: string): boolean {
      return isLimited(state, key);
    },
    record(key: string): void {
      record(state, key);
    },
    consume(key: string): boolean {
      if (isLimited(state, key)) return true;
      record(state, key);
      return false;
    },
    clear(key: string): void {
      state.buckets.delete(key);
    },
    reset(): void {
      state.buckets.clear();
      state.droppedActiveBuckets = 0;
      state.lastSaturationWarnAt = 0;
    },
    sweep(): void {
      sweep(state);
    },
    get size(): number {
      return state.buckets.size;
    },
  };
}
