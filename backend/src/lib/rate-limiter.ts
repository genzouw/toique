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

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const {
    windowMs,
    max,
    maxBuckets = DEFAULT_MAX_BUCKETS,
    sweepIntervalMs,
    name = 'rate-limiter',
  } = options;

  const buckets = new Map<string, number[]>();
  let droppedActiveBuckets = 0;
  let lastSaturationWarnAt = 0;

  // ソート済み配列の先頭から期限切れエントリ数をカウント
  function countExpired(history: number[], windowStart: number): number {
    let count = 0;
    while (count < history.length && history[count] <= windowStart) {
      count++;
    }
    return count;
  }

  // 期限切れタイムスタンプを取り除く。挿入順は意図的に更新しない
  // （更新すると上記の不変条件が壊れる）。
  function prune(key: string, now: number): number[] | undefined {
    const history = buckets.get(key);
    if (!history) return undefined;

    const expiredCount = countExpired(history, now - windowMs);
    if (expiredCount > 0) history.splice(0, expiredCount);

    if (history.length === 0) {
      buckets.delete(key);
      return undefined;
    }
    return history;
  }

  // 有効なバケットを捨てた = レート制限テーブルが飽和し、正規利用者のカウンタが
  // 意図せずリセットされたことを意味する。本番で「レート制限が効いていない」事象が
  // 起きたときに飽和が原因かを切り分けられるよう、必ず記録に残す。
  function reportSaturation(now: number) {
    droppedActiveBuckets++;
    if (now - lastSaturationWarnAt < SATURATION_WARN_INTERVAL_MS) return;

    lastSaturationWarnAt = now;
    logger.warn('rate limiter saturated: evicted active bucket', {
      name,
      size: buckets.size,
      droppedActiveBuckets,
    });
    droppedActiveBuckets = 0;
  }

  // maxBuckets 到達時に1件 evict する。挿入順の不変条件により、期限切れバケットが
  // 存在すれば必ず先頭にあるため、先頭を落とすだけで期限切れを優先削除できる。
  // 期限切れが1件も無い場合は、残り有効期間が最短のバケットを落とすことになる。
  function evictOldest(now: number) {
    const entry = buckets.entries().next().value;
    if (!entry) return;

    const [oldestKey, history] = entry;
    const lastTimestamp = history[history.length - 1];
    if (lastTimestamp !== undefined && lastTimestamp > now - windowMs) {
      reportSaturation(now);
    }
    buckets.delete(oldestKey);
  }

  function sweep() {
    const windowStart = Date.now() - windowMs;
    for (const [key, history] of buckets) {
      const expiredCount = countExpired(history, windowStart);
      if (expiredCount === history.length) {
        buckets.delete(key);
      } else if (expiredCount > 0) {
        history.splice(0, expiredCount);
      }
    }
  }

  if (sweepIntervalMs !== undefined) {
    setInterval(sweep, sweepIntervalMs).unref();
  }

  function isLimited(key: string): boolean {
    if (max <= 0) return true;
    const history = prune(key, Date.now());
    return history !== undefined && history.length >= max;
  }

  function record(key: string): void {
    const now = Date.now();
    const history = prune(key, now);

    if (!history) {
      if (buckets.size >= maxBuckets) evictOldest(now);
      buckets.set(key, [now]);
      return;
    }

    // タイムスタンプ追加と同時にバケットを末尾へ移動し、
    // 「挿入順 = lastTimestamp 昇順」の不変条件を維持する。
    buckets.delete(key);
    buckets.set(key, history);
    history.push(now);
  }

  return {
    isLimited,
    record,
    consume(key: string): boolean {
      if (isLimited(key)) return true;
      record(key);
      return false;
    },
    clear(key: string): void {
      buckets.delete(key);
    },
    reset(): void {
      buckets.clear();
      droppedActiveBuckets = 0;
      lastSaturationWarnAt = 0;
    },
    sweep,
    get size(): number {
      return buckets.size;
    },
  };
}
