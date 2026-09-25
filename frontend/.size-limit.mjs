import { readFileSync } from 'node:fs';

// index.html が読み込む JS/CSS (= 初期ロード) だけを計測対象にする。
// mermaid の図種別チャンクなど遅延ロードされるものはハッシュ付きファイル名で列挙できないため、
// ビルド成果物の index.html から参照先を取り出す。
const html = readFileSync('dist/index.html', 'utf8');
const assets = [
  ...new Set(
    [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(
      (m) => `dist/${m[1]}`,
    ),
  ),
];
const js = assets.filter((p) => p.endsWith('.js'));
const css = assets.filter((p) => p.endsWith('.css'));

export default [
  { name: 'entry chunk', path: 'dist/assets/index-*.js', limit: '180 kB' },
  {
    name: 'initial JS (index.html が参照する全 JS)',
    path: js,
    limit: '295 kB',
  },
  { name: 'initial CSS', path: css, limit: '7 kB' },
];
