import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// backup/restore-test.sh は「バックアップが無い」「一覧取得に失敗した」
// 「リストアの SQL が部分的に失敗した」のいずれも失敗として扱う必要がある。
// これらは `|| true` や psql の ON_ERROR_STOP 未指定を戻すだけで、再び無言で
// 成功扱いになる種類の退行であり、月次ジョブでしか表面化しない (#942)。
// PATH の先頭に偽の gcloud / psql を置いて、終了コードと psql への引数を固定する。
const SCRIPT_PATH = fileURLToPath(
  new URL('../backup/restore-test.sh', import.meta.url),
);

const BACKUP_NAME = 'toique_backup_20260101_000000.sql.gz';

let workDir;
let binDir;
let psqlLog;

function writeStub(name, body) {
  const path = join(binDir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'restore-test-'));
  binDir = join(workDir, 'bin');
  mkdirSync(binDir);
  psqlLog = join(workDir, 'psql.log');
  writeFileSync(join(workDir, 'dump.sql.gz'), gzipSync('SELECT 1;\n'));

  // `gcloud storage ls` は FAKE_LS_MODE で挙動を切り替え、`gcloud storage cp` は
  // 事前に用意した gzip を宛先へコピーする。
  writeStub(
    'gcloud',
    `case "$2" in
  ls)
    case "$FAKE_LS_MODE" in
      fail) echo "ERROR: 403 permission denied" >&2; exit 1 ;;
      empty) exit 0 ;;
      *) echo "gs://bucket/${BACKUP_NAME}" ;;
    esac
    ;;
  cp) cp "$FAKE_DUMP" "$4" ;;
esac`,
  );

  // psql は受け取った引数を記録する。`-f`（リストア本体）だけ FAKE_PSQL_FAIL で
  // 失敗させ、テーブル数の問い合わせには 3 を返す。
  writeStub(
    'psql',
    `echo "$*" >> "$FAKE_PSQL_LOG"
case "$*" in
  *" -f "*) [ -n "$FAKE_PSQL_FAIL" ] && exit 3 ;;
  *information_schema*) echo " 3" ;;
esac
exit 0`,
  );
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function runScript(env = {}) {
  return spawnSync('bash', [SCRIPT_PATH], {
    encoding: 'utf8',
    env: {
      PATH: `${binDir}:${process.env.PATH}`,
      GCS_BUCKET: 'bucket',
      POSTGRES_HOST: 'localhost',
      POSTGRES_USER: 'user',
      POSTGRES_PASSWORD: 'password',
      POSTGRES_DB: 'db',
      FAKE_DUMP: join(workDir, 'dump.sql.gz'),
      FAKE_PSQL_LOG: psqlLog,
      ...env,
    },
  });
}

describe('backup/restore-test.sh', () => {
  it('バックアップの一覧取得に失敗したら exit 1 になる', () => {
    const result = runScript({ FAKE_LS_MODE: 'fail' });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Failed to list');
  });

  it('バックアップが 1 件も無ければ exit 1 になる', () => {
    const result = runScript({ FAKE_LS_MODE: 'empty' });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('No backup files found');
  });

  it('リストアの SQL が失敗したら非 0 で終了し、成功メッセージを出さない', () => {
    const result = runScript({ FAKE_PSQL_FAIL: '1' });
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain('Restore completed successfully.');
  });

  it('psql の初期化とリストアを ON_ERROR_STOP=1 で実行する', () => {
    const result = runScript();
    expect(result.status).toBe(0);
    const calls = readFileSync(psqlLog, 'utf8').trim().split('\n');
    const drop = calls.find((line) => line.includes('DROP SCHEMA'));
    const restore = calls.find((line) => line.includes(' -f '));
    expect(drop).toContain('ON_ERROR_STOP=1');
    expect(restore).toContain('ON_ERROR_STOP=1');
    expect(result.stdout).toContain('Restore completed successfully.');
  });
});
