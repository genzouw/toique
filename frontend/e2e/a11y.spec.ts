// 公開ページに WCAG 2.1 A/AA 相当の違反がないことを axe-core で検査する (Issue #848)。
// 認証必要画面はセッション戦略が独立するため csp-smoke.spec.ts と同様にスコープ外。
//
// 違反を除外する場合は `.disableRules(['<rule-id>'])` に理由と追跡 Issue 番号を添える。
// チェック全体を非ブロッキングにしない (違反が観測されても気づかれない構造を避ける)。

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { PUBLIC_ROUTES } from './public-routes';

for (const path of PUBLIC_ROUTES) {
  test(`公開ページに WCAG 2.1 A/AA 違反がない: ${path}`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response!.status(), `HTTP status for ${path}`).toBeLessThan(400);

    // SPA の描画完了を待つ (空の #root を検査して偽陰性になるのを防ぐ)。
    // /help は h1 を持たないため h2 も許容する。
    await expect(page.locator('h1, h2').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(
      results.violations.map((v) => `${v.id} (${v.nodes.length} node(s))`),
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  });
}
