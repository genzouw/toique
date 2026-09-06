import { describe, expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// fail-on-sensitive-file.mjs は SAFE_FILE_PATTERNS に一致しないファイルを
// すべて「秘匿ファイル」として exit 1 で拒否する（lint-staged 側のグロブで
// 既に絞り込まれた候補のみが渡される前提）。ここでは以下を fixture として固定し、
// 将来 SAFE_FILE_PATTERNS を変更した際に「本来ブロックすべきファイルが素通り
// してしまう」「テンプレート/設定ファイルが誤ってブロックされる」の両方の
// 回帰を CI で検知できるようにする。
// (#763 のセルフレビューで指摘: .env.example / .secretlintrc.json の誤検知が
// 手動検証のみで固定されておらず、次の変更で同じ穴が再発しても気づけなかった)
const SCRIPT_PATH = fileURLToPath(
  new URL('./fail-on-sensitive-file.mjs', import.meta.url),
);

// ブロックすべきファイル（SAFE_FILE_PATTERNS に一致せず exit 1 になるべき）
const BLOCKED_FILES = [
  '.env',
  'backend/.env',
  'id_rsa',
  'certs/server.pem',
  'config/credentials.json',
  'app-secret.json',
  'terraform.tfstate',
];

// 通すべきファイル（SAFE_FILE_PATTERNS に一致し exit 0 になるべき）
const SAFE_FILES = [
  '.env.example',
  'frontend/.env.example',
  '.env.sample',
  '.env.template',
  '.env.dist',
  '.secretlintrc.json',
  'nested/dir/.secretlintrc.json',
];

function run(files) {
  return spawnSync('node', [SCRIPT_PATH, ...files], { encoding: 'utf8' });
}

describe('fail-on-sensitive-file.mjs', () => {
  it('引数無しでは何もブロックしない (exit 0)', () => {
    expect(run([]).status).toBe(0);
  });

  for (const file of BLOCKED_FILES) {
    it(`秘匿ファイル ${file} をブロックする (exit 1)`, () => {
      expect(run([file]).status).toBe(1);
    });
  }

  for (const file of SAFE_FILES) {
    it(`許可リスト対象 ${file} は通す (exit 0)`, () => {
      expect(run([file]).status).toBe(0);
    });
  }

  it('許可リスト対象と秘匿ファイルが混在する場合はブロックする (exit 1)', () => {
    const result = run(['.env.example', '.env']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env');
    expect(result.stderr).not.toContain('.env.example');
  });
});
