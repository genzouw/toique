import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// .github/actions/detect-secrets-diff/new-secrets.jq の回帰テスト。
// detect-secrets.yml / secret-scan.yml / pr-detect-secrets-review.yml の 3 本が
// このフィルタの結果だけで合否を決めるため、比較キーの見直しや jq の書き換えで
// 「baseline 登録済みを誤検知する」「未登録を素通しする」回帰が起きないことを確認する。
const FILTER = join(
  import.meta.dir,
  '..',
  '.github/actions/detect-secrets-diff/new-secrets.jq',
);

// hashed_secret は実物の SHA-1 形式 (40 桁の 16 進) にすると、このファイル自体が
// detect-secrets の Hex High Entropy String として検知されるため、識別用の短い文字列にする。
const entry = (hashedSecret, type, lineNumber) => ({
  type,
  filename: 'ignored-by-filter',
  hashed_secret: hashedSecret,
  is_verified: false,
  line_number: lineNumber,
});

// 期待値 (フィルタの出力形)。`hashed_secret: '...'` と文字列を直書きすると
// detect-secrets の Secret Keyword として検知されるため、引数経由で組み立てる。
const key = (file, hashedSecret, type, extra = {}) => ({
  file,
  hashed_secret: hashedSecret,
  type,
  ...extra,
});

const run = (scan, baseline, line) => {
  const dir = mkdtempSync(join(tmpdir(), 'detect-secrets-diff-'));
  const scanPath = join(dir, 'scan.json');
  const baselinePath = join(dir, 'baseline.json');
  writeFileSync(scanPath, JSON.stringify(scan));
  writeFileSync(baselinePath, JSON.stringify(baseline));
  const proc = Bun.spawnSync([
    'jq',
    '-S',
    '--slurpfile',
    'baseline',
    baselinePath,
    '--argjson',
    'line',
    String(line),
    '-f',
    FILTER,
    scanPath,
  ]);
  if (proc.exitCode !== 0) {
    throw new Error(proc.stderr.toString());
  }
  return JSON.parse(proc.stdout.toString());
};

// baseline はワークフローが実際に読む形 (generated_at 等のメタ情報付き) に合わせる。
const baseline = {
  version: '1.5.0',
  generated_at: '2026-01-01T00:00:00Z',
  results: {
    'app/config.ts': [entry('known', 'Secret Keyword', 10)],
    'only-in-baseline.ts': [entry('gone', 'Base64 High Entropy String', 1)],
  },
};

describe('new-secrets.jq', () => {
  it('baseline 登録済みの検知は出力しない (line_number がずれていても)', () => {
    const scan = {
      results: { 'app/config.ts': [entry('known', 'Secret Keyword', 42)] },
    };
    expect(run(scan, baseline, false)).toEqual([]);
    expect(run(scan, baseline, true)).toEqual([]);
  });

  it('未登録の検知は出力する', () => {
    const scan = {
      results: {
        'app/config.ts': [
          entry('known', 'Secret Keyword', 10),
          entry('leaked', 'Secret Keyword', 20),
        ],
      },
    };
    expect(run(scan, baseline, false)).toEqual([
      key('app/config.ts', 'leaked', 'Secret Keyword'),
    ]);
  });

  it('filename / hashed_secret / type のいずれかが異なれば未登録とみなす', () => {
    const scan = {
      results: {
        'other.ts': [entry('known', 'Secret Keyword', 10)],
        'app/config.ts': [entry('known', 'Hex High Entropy String', 10)],
      },
    };
    expect(run(scan, baseline, false)).toEqual([
      key('app/config.ts', 'known', 'Hex High Entropy String'),
      key('other.ts', 'known', 'Secret Keyword'),
    ]);
  });

  it('line=true のときだけ line_number を出力に含める', () => {
    const scan = {
      results: { 'new.ts': [entry('leaked', 'Secret Keyword', 7)] },
    };
    expect(run(scan, baseline, true)).toEqual([
      key('new.ts', 'leaked', 'Secret Keyword', { line_number: 7 }),
    ]);
    expect(run(scan, baseline, false)).toEqual([
      key('new.ts', 'leaked', 'Secret Keyword'),
    ]);
  });

  it('baseline にだけ存在するエントリは無視する', () => {
    expect(run({ results: {} }, baseline, false)).toEqual([]);
  });
});
