import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createRateLimiter } from './rate-limiter.js';
import { logger } from './logger.js';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');
const WINDOW_MS = 60 * 60 * 1000;
const MAX = 5;

function build(maxBuckets?: number) {
  return createRateLimiter({
    windowMs: WINDOW_MS,
    max: MAX,
    maxBuckets,
    name: 'test',
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('同一キーは上限を超えると拒否される', () => {
  const limiter = build();
  for (let i = 0; i < MAX; i++) {
    expect(limiter.consume('1.2.3.4')).toBe(false);
  }
  expect(limiter.consume('1.2.3.4')).toBe(true);
});

test('ウィンドウ経過後は再びリクエストを受理する', () => {
  const limiter = build();
  for (let i = 0; i < MAX; i++) limiter.consume('1.2.3.4');
  expect(limiter.consume('1.2.3.4')).toBe(true);

  vi.setSystemTime(T0 + WINDOW_MS + 1);
  expect(limiter.consume('1.2.3.4')).toBe(false);
});

test('isLimited は履歴を増やさない（判定だけでは消費しない）', () => {
  const limiter = build();
  for (let i = 0; i < 10; i++) expect(limiter.isLimited('1.2.3.4')).toBe(false);
  expect(limiter.size).toBe(0);
});

test('max が 0 以下なら常に制限扱いになる', () => {
  const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: 0 });
  expect(limiter.consume('1.2.3.4')).toBe(true);
  expect(limiter.size).toBe(0);
});

test('制限中の拒否リクエストではバケット位置を末尾へ移動しない', () => {
  const limiter = build(2);
  for (let i = 0; i < MAX; i++) limiter.consume('attacker');

  vi.setSystemTime(T0 + 1000);
  limiter.consume('later');

  // 拒否されるリクエストを何度受けても挿入順は変わらない
  vi.setSystemTime(T0 + 2000);
  for (let i = 0; i < 3; i++) expect(limiter.consume('attacker')).toBe(true);

  // 新規キーの到来で先頭が evict される。不変条件が保たれていれば
  // 先頭は lastTimestamp が最も古い attacker のままである。
  vi.setSystemTime(T0 + 3000);
  expect(limiter.consume('newcomer')).toBe(false);
  expect(limiter.size).toBe(2);
  expect(limiter.isLimited('attacker')).toBe(false);
});

// 回帰テスト:
// 旧実装では拒否リクエストでもバケットを Map 末尾へ移動していたため、
// lastTimestamp が古いままのバケットが走査範囲の外へ逃げ、
// evict 時に期限切れバケットではなく有効なバケットが削除されていた。
test('末尾へ逃げた期限切れバケットが有効バケットより先に削除される', () => {
  const limiter = build(4);

  // 1. 上限まで使い切ったバケットを登録する (lastTimestamp = T0 で固定される)
  for (let i = 0; i < MAX; i++) limiter.consume('expired-ip');

  // 2. 有効バケットを後ろに積んで Map を飽和させる
  //    (isLimited で生死を観測できるよう、いずれも上限まで使い切っておく)
  vi.setSystemTime(T0 + 1000);
  for (const key of ['filler-0', 'filler-1', 'victim-ip']) {
    for (let i = 0; i < MAX; i++) limiter.consume(key);
  }
  expect(limiter.size).toBe(4);

  // 3. 拒否リクエストを大量に受ける
  //    旧実装ではここで expired-ip が Map 末尾 (走査範囲外) へ移動していた
  vi.setSystemTime(T0 + 2000);
  for (let i = 0; i < 100; i++)
    expect(limiter.consume('expired-ip')).toBe(true);

  // 4. ウィンドウ経過で expired-ip だけが期限切れになる
  vi.setSystemTime(T0 + WINDOW_MS + 1);

  // 5. 新規キーの到来で evict が発生する
  expect(limiter.consume('newcomer')).toBe(false);

  expect(limiter.isLimited('expired-ip')).toBe(false);
  expect(limiter.isLimited('victim-ip')).toBe(true);
  expect(limiter.isLimited('filler-0')).toBe(true);
  expect(limiter.size).toBe(4);
});

test('リクエストを受理し続けるアクティブなキーは初回登録が古くても優先削除されない', () => {
  const limiter = build(3);
  for (let i = 0; i < MAX - 1; i++) limiter.consume('long-lived');

  vi.setSystemTime(T0 + 500);
  for (const key of ['filler-0', 'filler-1']) {
    for (let i = 0; i < MAX; i++) limiter.consume(key);
  }
  expect(limiter.size).toBe(3);

  // アクティブなキーとして再度リクエストを受理させる
  vi.setSystemTime(T0 + 1000);
  expect(limiter.consume('long-lived')).toBe(false);

  // 新規キーの到来で evict が発生する
  expect(limiter.consume('newcomer')).toBe(false);

  expect(limiter.isLimited('long-lived')).toBe(true);
  expect(limiter.isLimited('filler-1')).toBe(true);
  expect(limiter.isLimited('filler-0')).toBe(false);
});

// 回帰テスト:
// evictOldest は先頭から連続する期限切れバケットを1回の呼び出しでまとめて
// 削除する。旧仕様（先頭1件だけ削除）へ退行しても、evictedCount が1件になる
// ケースしか無いテストでは検知できないため、2件以上の連続evictを検証する。
test('先頭に複数の期限切れバケットがある場合は1回の呼び出しでまとめてevictされる', () => {
  const limiter = build(5);

  // 1. 3件のバケットを上限まで使い切って登録する（lastTimestamp = T0 で期限切れ予定）
  for (const key of ['expired-0', 'expired-1', 'expired-2']) {
    for (let i = 0; i < MAX; i++) limiter.consume(key);
  }

  // 2. 有効なバケットを2件積んで Map を飽和させる（size = maxBuckets = 5）
  vi.setSystemTime(T0 + 1000);
  for (const key of ['active-0', 'active-1']) {
    for (let i = 0; i < MAX; i++) limiter.consume(key);
  }
  expect(limiter.size).toBe(5);

  // 3. ウィンドウ経過で expired-* だけが期限切れになる
  vi.setSystemTime(T0 + WINDOW_MS + 1);

  // 4. 新規キー1件の到来（record() 1回）で先頭の期限切れ3件がまとめて evict される
  expect(limiter.consume('newcomer')).toBe(false);

  // 期限切れ3件が削除され newcomer 1件が追加されるので size = 5 - 3 + 1 = 3
  expect(limiter.size).toBe(3);
  expect(limiter.isLimited('expired-0')).toBe(false);
  expect(limiter.isLimited('expired-1')).toBe(false);
  expect(limiter.isLimited('expired-2')).toBe(false);
  expect(limiter.isLimited('active-0')).toBe(true);
  expect(limiter.isLimited('active-1')).toBe(true);
  // 期限切れバケットの evict なので saturation 警告は出ない
  expect(logger.warn).not.toHaveBeenCalled();
});

test('期限切れバケットの evict では warn を出さない', () => {
  const limiter = build(2);
  limiter.consume('a');
  vi.setSystemTime(T0 + 1000);
  limiter.consume('b');

  vi.setSystemTime(T0 + WINDOW_MS + 1);
  limiter.consume('c');

  expect(logger.warn).not.toHaveBeenCalled();
});

test('有効なバケットを evict したときは warn を出し、1分間は間引く', () => {
  const limiter = build(2);
  limiter.consume('a');
  limiter.consume('b');

  // 飽和状態で有効な 'a' が捨てられる
  limiter.consume('c');
  expect(logger.warn).toHaveBeenCalledTimes(1);

  // 直後の飽和は間引かれる
  limiter.consume('d');
  expect(logger.warn).toHaveBeenCalledTimes(1);

  // 間引き間隔を過ぎたら、その間の件数を添えて再度出力する
  vi.setSystemTime(T0 + 60 * 1000);
  limiter.consume('e');
  expect(logger.warn).toHaveBeenCalledTimes(2);
  expect(logger.warn).toHaveBeenLastCalledWith(
    'rate limiter saturated: evicted active bucket',
    expect.objectContaining({ name: 'test', droppedActiveBuckets: 2 }),
  );
});

test('clear は単一キーの履歴だけを破棄する', () => {
  const limiter = build();
  for (let i = 0; i < MAX; i++) limiter.consume('a');
  for (let i = 0; i < MAX; i++) limiter.consume('b');

  limiter.clear('a');

  expect(limiter.isLimited('a')).toBe(false);
  expect(limiter.isLimited('b')).toBe(true);
  expect(limiter.size).toBe(1);
});

test('reset は全バケットを破棄する', () => {
  const limiter = build();
  limiter.consume('a');
  limiter.consume('b');
  expect(limiter.size).toBe(2);

  limiter.reset();
  expect(limiter.size).toBe(0);
});

test('sweep は期限切れバケットを取り除き、有効なものは残す', () => {
  const limiter = build();
  limiter.consume('old');
  vi.setSystemTime(T0 + WINDOW_MS - 1000);
  limiter.consume('fresh');

  vi.setSystemTime(T0 + WINDOW_MS + 1);
  limiter.sweep();

  expect(limiter.size).toBe(1);
  expect(limiter.consume('fresh')).toBe(false);
});

test('sweepIntervalMs を指定すると定期的にスイープされる', () => {
  const limiter = createRateLimiter({
    windowMs: WINDOW_MS,
    max: MAX,
    sweepIntervalMs: WINDOW_MS,
    name: 'test',
  });
  limiter.consume('old');
  expect(limiter.size).toBe(1);

  vi.advanceTimersByTime(WINDOW_MS + 1);
  expect(limiter.size).toBe(0);
});
