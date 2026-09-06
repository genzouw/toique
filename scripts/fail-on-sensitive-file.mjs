#!/usr/bin/env node
// lint-staged から呼ばれ、ステージされた秘匿ファイル / AI 作業跡を検出してコミットを止める。
//
// 対象パターンは package.json の lint-staged キーが持つ。ここは「該当したら落とす」
// 責務だけを持ち、同じ長いインラインコマンドを全パターン分書き並べるのを避けるために
// 独立したスクリプトにしている。
//
// package.json 側のパターンは秘匿ファイルの命名慣習を広く拾うため、意図的に
// コミットされるテンプレートファイルも誤検知する（`.env.example` は `**/.env.*` に
// マッチしてしまう）。`.husky/pre-commit` と `.github/workflows/forbidden-paths.yml`
// は同種の誤検知を許可リストの正規表現で除外しており、ここも揃える。
const SAFE_FILE_PATTERNS = [/(^|\/)\.env\.(example|sample|template|dist)$/];

const files = process.argv
  .slice(2)
  .filter((f) => !SAFE_FILE_PATTERNS.some((re) => re.test(f)));

if (files.length === 0) {
  process.exit(0);
}

console.error('[FATAL] Sensitive files or AI footprints detected:');
for (const f of files) {
  console.error(`  - ${f}`);
}
console.error('');
console.error('これらはリポジトリにコミットしないでください。');
console.error(
  'git restore --staged <file> でステージから外し、必要なら .gitignore に追加してください。',
);
process.exit(1);
