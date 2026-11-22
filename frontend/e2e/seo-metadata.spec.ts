// 公開ページごとに、描画後の DOM にページ固有の meta description があることを検査する (Issue #1118)。
//
// index.html には JS を実行しないクローラー向けに静的な description を残している。
// Lighthouse の `meta-description` 監査は静的な description だけでも通るため、
// `<SEOMetadata description=...>` が欠落してもそれだけでは検出できない。
// そこで index.html の既定値と異なる description が描画後に存在することを確認する。

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { PUBLIC_ROUTES } from './public-routes';

// playwright test は frontend/ をカレントディレクトリとして実行される。
const indexHtml = readFileSync('index.html', 'utf-8');
const staticDescription = /<meta\s+name="description"\s+content="([^"]+)"/.exec(
  indexHtml,
)?.[1];

test('index.html の既定 description を取得できる', () => {
  expect(
    staticDescription,
    'index.html に静的な meta description が見つからない',
  ).toBeTruthy();
});

for (const path of PUBLIC_ROUTES) {
  test(`公開ページにページ固有の meta description がある: ${path}`, async ({
    page,
  }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response!.status(), `HTTP status for ${path}`).toBeLessThan(400);

    // SPA の描画完了を待つ (a11y.spec.ts と同じ)。
    await expect(page.locator('h1, h2').first()).toBeVisible();

    const descriptions = await page
      .locator('head meta[name="description"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
    const pageSpecific = descriptions.filter(
      (d) => d.trim() !== '' && d !== staticDescription,
    );

    expect(
      pageSpecific,
      `${path} に index.html と異なる meta description がない (SEOMetadata の description 欠落の疑い)。検出: ${JSON.stringify(descriptions)}`,
    ).not.toHaveLength(0);
  });
}
