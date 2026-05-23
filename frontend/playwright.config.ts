// Playwright 設定: Issue #234 の CSP 違反観測経路の補強として、
// 公開ページの主要画面をビルド済み成果物 (dist) ベースで巡回する。
//
// webServer に `wrangler pages dev` を採用する理由:
// - `_headers` (CSP 含む) は Cloudflare Pages 配信時のみ適用される。
//   Vite preview では効かないため、本番同等の挙動で違反を検知するために wrangler を使う。
// - 同様に Pages Functions (`/api/csp-report`) も wrangler 経由で動作する。
//
// ブラウザは Chromium 単一構成。Issue #234 は Cloudflare 配信下での CSP 違反検知が主目的で、
// クロスブラウザの挙動検証は本 E2E のスコープ外。

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `--compatibility-date` を明示しないと wrangler が当日を採用するため、
    // CI 実行日 > 同梱 workerd binary の対応最新日 のときに WebServer 起動が
    // "This Worker requires compatibility date ... newest date supported by this
    // server binary is ..." で失敗する。bun.lock 上の workerd@1.20260515.x に
    // 対応する 2026-05-15 を採用 (Cloudflare 推奨: 固定日付で挙動を安定化)。
    command: `bunx wrangler pages dev dist --port ${PORT} --ip 127.0.0.1 --log-level warn --compatibility-date=2026-05-15`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
