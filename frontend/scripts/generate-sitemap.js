/**
 * ビルド時に sitemap.xml を自動生成するスクリプト
 * 公開ページを追加・削除した場合はこの配列を更新する
 */
const SITE_URL = 'https://toique.pages.dev';

const pages = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/help', changefreq: 'monthly', priority: 0.7 },
  { path: '/login', changefreq: 'monthly', priority: 0.5 },
  { path: '/signup', changefreq: 'monthly', priority: 0.5 },
];

const today = new Date().toISOString().slice(0, 10);

const urls = pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

import { writeFileSync } from 'fs';
writeFileSync('dist/sitemap.xml', sitemap);
console.log(`sitemap.xml generated (${pages.length} pages)`);
