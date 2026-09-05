#!/usr/bin/env node
// lint-staged から呼ばれ、ステージされた秘匿ファイル / AI 作業跡を検出してコミットを止める。
//
// 対象パターンは package.json の lint-staged キーが持つ。ここは「該当したら落とす」
// 責務だけを持ち、同じ長いインラインコマンドを全パターン分書き並べるのを避けるために
// 独立したスクリプトにしている。
const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

console.error('[FATAL] Sensitive files or AI footprints detected:');
for (const f of files) {
  console.error(`  - ${f}`);
}
console.error('');
console.error('これらはリポジトリにコミットしないでください。');
console.error('git restore --staged <file> でステージから外し、必要なら .gitignore に追加してください。');
process.exit(1);
