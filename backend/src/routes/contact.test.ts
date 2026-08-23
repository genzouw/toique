import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  MAX_BUCKETS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  rateBuckets,
  rateLimited,
} from './contact.js';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');

beforeEach(() => {
  rateBuckets.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  rateBuckets.clear();
});

test('同一IPは上限を超えると拒否される', () => {
  for (let i = 0; i < RATE_LIMIT_MAX; i++) {
    expect(rateLimited('1.2.3.4')).toBe(false);
  }
  expect(rateLimited('1.2.3.4')).toBe(true);
});

test('ウィンドウ経過後は再びリクエストを受理する', () => {
  for (let i = 0; i < RATE_LIMIT_MAX; i++) rateLimited('1.2.3.4');
  expect(rateLimited('1.2.3.4')).toBe(true);

  vi.setSystemTime(T0 + RATE_LIMIT_WINDOW_MS + 1);
  expect(rateLimited('1.2.3.4')).toBe(false);
});

test('制限中の拒否リクエストではバケット位置を末尾へ移動しない', () => {
  for (let i = 0; i < RATE_LIMIT_MAX; i++) rateLimited('attacker');
  rateLimited('later');

  // 拒否されるリクエストを何度受けても挿入順は変わらない
  for (let i = 0; i < 3; i++) expect(rateLimited('attacker')).toBe(true);

  expect([...rateBuckets.keys()]).toEqual(['attacker', 'later']);
});

// 回帰テスト:
// 旧実装では拒否リクエストでもバケットを Map 末尾へ移動していたため、
// lastTimestamp が古いままのバケットが走査範囲 (EVICT_SCAN_LIMIT=64) の外へ逃げ、
// evict 時に期限切れバケットではなく有効なバケットが削除されていた。
test('走査範囲外へ逃げた期限切れバケットが有効バケットより先に削除される', () => {
  // 1. 上限まで使い切ったバケットを登録する (lastTimestamp = T0 で固定される)
  for (let i = 0; i < RATE_LIMIT_MAX; i++) rateLimited('expired-ip');

  // 2. 走査上限を大きく超える数の有効バケットを後ろに積んで Map を飽和させる
  vi.setSystemTime(T0 + 1000);
  for (let i = 0; i < MAX_BUCKETS - 2; i++) rateLimited(`filler-${i}`);
  rateLimited('victim-ip');
  expect(rateBuckets.size).toBe(MAX_BUCKETS);

  // 3. 拒否リクエストを大量に受ける
  //    旧実装ではここで expired-ip が Map 末尾 (走査範囲外) へ移動していた
  vi.setSystemTime(T0 + 2000);
  for (let i = 0; i < 100; i++) expect(rateLimited('expired-ip')).toBe(true);

  // 4. ウィンドウ経過で expired-ip だけが期限切れになる
  vi.setSystemTime(T0 + RATE_LIMIT_WINDOW_MS + 1);

  // 5. 新規 IP の到来で evict が発生する
  expect(rateLimited('newcomer')).toBe(false);

  expect(rateBuckets.has('expired-ip')).toBe(false);
  expect(rateBuckets.has('victim-ip')).toBe(true);
  expect(rateBuckets.has('filler-0')).toBe(true);
  expect(rateBuckets.has('newcomer')).toBe(true);
});

test('リクエストを受理し続けるアクティブなIPは初回登録が古くても優先削除されない', () => {
  rateLimited('long-lived');
  for (let i = 0; i < MAX_BUCKETS - 1; i++) rateLimited(`filler-${i}`);
  expect(rateBuckets.size).toBe(MAX_BUCKETS);

  // アクティブな IP として再度リクエストを受理させる
  vi.setSystemTime(T0 + 1000);
  expect(rateLimited('long-lived')).toBe(false);

  // 新規 IP の到来で evict が発生する
  expect(rateLimited('newcomer')).toBe(false);

  expect(rateBuckets.has('long-lived')).toBe(true);
  expect(rateBuckets.has('filler-0')).toBe(false);
});
