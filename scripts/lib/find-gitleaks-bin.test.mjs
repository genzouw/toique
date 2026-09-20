import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// find_latest_gitleaks_bin() は「PATH に gitleaks が無い場合、キャッシュ済みの
// 複数バージョンの中から最新のものを選ぶ」という .husky/pre-push と
// scripts/run-security-scans-local.sh 共通の処理。失敗モードが「黙って
// 空文字列を返す」であり、壊れてもスキャンが静かに止まるだけで誰も気づけない
// ため回帰テストを追加する (PR #864 の自己レビュー指摘)。
//
// このファイルは source して使う POSIX sh のライブラリであり、直接実行できない
// ため、`sh -c '. "$1" && find_latest_gitleaks_bin "$2"'` で source した上で
// 関数を呼び出す。
const LIB_PATH = fileURLToPath(
  new URL('./find-gitleaks-bin.sh', import.meta.url),
);

function findLatestGitleaksBin(cacheDir) {
  const result = spawnSync(
    'sh',
    ['-c', '. "$1" && find_latest_gitleaks_bin "$2"', 'sh', LIB_PATH, cacheDir],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(
      `find_latest_gitleaks_bin failed (status=${result.status}): ${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

// ダミーの gitleaks バイナリを作成する。
function createDummyBin(dir, name, { executable = true } = {}) {
  const path = join(dir, name);
  writeFileSync(path, '#!/bin/sh\necho dummy\n');
  chmodSync(path, executable ? 0o755 : 0o644);
  return path;
}

describe('find_latest_gitleaks_bin', () => {
  let cacheDir;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'gitleaks-bin-test-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('複数バージョンが混在するとき最新のものを返す', () => {
    createDummyBin(cacheDir, 'gitleaks-8.9.0');
    createDummyBin(cacheDir, 'gitleaks-8.30.1');
    createDummyBin(cacheDir, 'gitleaks-8.21.2');

    expect(findLatestGitleaksBin(cacheDir)).toBe(
      join(cacheDir, 'gitleaks-8.30.1'),
    );
  });

  it('gitleaks-*.tar.gz を無視する', () => {
    createDummyBin(cacheDir, 'gitleaks-8.9.0');
    // アーカイブは実行権限があっても候補から除外されるべき
    createDummyBin(cacheDir, 'gitleaks-8.99.0.tar.gz');

    expect(findLatestGitleaksBin(cacheDir)).toBe(
      join(cacheDir, 'gitleaks-8.9.0'),
    );
  });

  it('実行権限の無いファイルを無視する', () => {
    createDummyBin(cacheDir, 'gitleaks-8.21.2');
    createDummyBin(cacheDir, 'gitleaks-8.30.1', { executable: false });

    expect(findLatestGitleaksBin(cacheDir)).toBe(
      join(cacheDir, 'gitleaks-8.21.2'),
    );
  });

  it('ディレクトリが存在しない場合は空文字列を返す', () => {
    expect(findLatestGitleaksBin(join(cacheDir, 'does-not-exist'))).toBe('');
  });

  it('空ディレクトリの場合は空文字列を返す', () => {
    expect(findLatestGitleaksBin(cacheDir)).toBe('');
  });

  it('バージョン混在・アーカイブ・実行権限無しが同居していても最新の実行可能バイナリを返す', () => {
    createDummyBin(cacheDir, 'gitleaks-8.9.0');
    createDummyBin(cacheDir, 'gitleaks-8.21.2');
    createDummyBin(cacheDir, 'gitleaks-8.30.1');
    createDummyBin(cacheDir, 'gitleaks-8.99.0.tar.gz');
    createDummyBin(cacheDir, 'gitleaks-9.0.0', { executable: false });

    expect(findLatestGitleaksBin(cacheDir)).toBe(
      join(cacheDir, 'gitleaks-8.30.1'),
    );
  });
});
