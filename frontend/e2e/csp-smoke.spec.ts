// 公開ページの主要画面を巡回し、以下のいずれかが発生したら失敗とする:
// - CSP 違反を示すコンソールメッセージ (Chromium: "Refused to ..." / "Content Security Policy")
// - CSP 違反レポート受信エンドポイント (`/api/csp-report`) への送信
// - 未捕捉の JS 例外 (pageerror)
//
// Issue #234 で問題視された「Report-Only 期間中に違反が観測されていなかった」
// 構造的弱さを CI 側でも補完するのが目的。
//
// バックエンド (Cloud Run) への接続エラー (ERR_CONNECTION_REFUSED) は CI 環境では
// 不可避なので意図的に無視する。バックエンドモックを伴う本格的な E2E は別 PR のスコープ。
// 認証必要画面 (Dashboard / Channels 等) もセッション戦略の設計が独立するため別 PR。

import { test, expect, type ConsoleMessage } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/pricing',
  '/help',
  '/faq',
  '/contact',
  '/specified-commercial-transactions',
  '/for/salon',
];

// Chromium が CSP 違反時に出力するコンソールメッセージのパターン。
// 例: "Refused to load the script 'https://...' because it violates the following Content Security Policy directive: ..."
const CSP_VIOLATION_PATTERNS: RegExp[] = [
  /Content Security Policy/i,
  /^Refused to /i,
];

const isCspViolationMessage = (msg: ConsoleMessage): boolean => {
  if (msg.type() !== 'error') return false;
  const text = msg.text();
  return CSP_VIOLATION_PATTERNS.some((p) => p.test(text));
};

for (const path of PUBLIC_ROUTES) {
  test(`公開ページが CSP 違反を発生させない: ${path}`, async ({ page }) => {
    const cspConsoleMessages: string[] = [];
    const pageErrors: Error[] = [];
    const cspReportRequests: string[] = [];

    page.on('console', (msg) => {
      if (isCspViolationMessage(msg)) {
        cspConsoleMessages.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname === '/api/csp-report') {
        cspReportRequests.push(req.method() + ' ' + req.url());
      }
    });

    const response = await page.goto(path, { waitUntil: 'networkidle' });
    expect(response, `no response for ${path}`).not.toBeNull();
    expect(response!.status(), `HTTP status for ${path}`).toBeLessThan(400);

    expect(
      cspConsoleMessages,
      `CSP violation console messages on ${path}:\n${cspConsoleMessages.join('\n')}`,
    ).toEqual([]);
    expect(
      pageErrors.map((e) => e.message),
      `unhandled page errors on ${path}`,
    ).toEqual([]);
    expect(
      cspReportRequests,
      `CSP report requests fired on ${path}:\n${cspReportRequests.join('\n')}`,
    ).toEqual([]);
  });
}
