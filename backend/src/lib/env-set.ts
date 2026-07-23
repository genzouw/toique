/**
 * カンマ区切りの環境変数 (例: `FOO_EMAILS=a@example.com,b@example.com`) を
 * `ReadonlySet<string>` としてパースし、結果をメモ化して返すヘルパー。
 *
 * 環境変数の生文字列が前回と同じであればキャッシュを再利用するため、
 * リクエストの都度 split/map/filter を行うオーバーヘッドを避けられる。
 * 一方で `vi.stubEnv` などにより値が変わった場合は正しく再パースされる。
 */
export function createEnvSetReader(envKey: string): () => ReadonlySet<string> {
  let cachedRaw: string | undefined;
  let cachedSet: ReadonlySet<string> | undefined;

  return () => {
    const raw = process.env[envKey] ?? '';
    if (cachedSet && cachedRaw === raw) {
      return cachedSet;
    }
    cachedRaw = raw;
    cachedSet = new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    return cachedSet;
  };
}
