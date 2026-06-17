/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import Sitemap from 'vite-plugin-sitemap';

// VITE_SITE_ORIGIN の真実の源は .env(.local) → process.env → ここのフォールバック。
// 値は src/lib/site.ts と一致させること。
const SITE_ORIGIN_FALLBACK = 'https://example.com';

// vite 8.x + vitest 4.x + @tailwindcss/vite + vite-plugin-sitemap の組み合わせで
// 関数フォームの defineConfig は plugins 配列の合併型 (Plugin<any> | Plugin<any>[])[]
// を比較する際に深度上限に達し TS2321 を引き起こす。
// オブジェクトフォームを使い、プラグインを事前に Plugin[] へ集約することで
// 推論深度を浅くする。mode は NODE_ENV から決定する。
const mode = process.env.NODE_ENV ?? 'development';
const env = loadEnv(mode, process.cwd(), 'VITE_');
const siteOrigin = env.VITE_SITE_ORIGIN ?? SITE_ORIGIN_FALLBACK;

const plugins: Plugin[] = [
  ...([react()].flat() as Plugin[]),
  ...([tailwindcss()].flat() as Plugin[]),
  // index.html の __SITE_ORIGIN__ プレースホルダを解決済み値で置換する。
  // Vite 標準の %VITE_*% 展開は .env が存在しないと警告を出すため、独自記号で回避する。
  {
    name: 'inject-site-origin',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_ORIGIN__', siteOrigin);
    },
  },
  Sitemap({
    hostname: siteOrigin,
    dynamicRoutes: [
      '/help',
      '/pricing',
      '/contact',
      '/login',
      '/signup',
      '/specified-commercial-transactions',
    ],
    exclude: [
      '/dashboard',
      '/channels',
      '/forms',
      '/submissions',
      '/messages',
      '/onboarding',
    ],
    changefreq: 'monthly',
    // robots.txt も同プラグインから siteOrigin を参照して生成する。
    // public/ に robots.txt を置くとビルド時に上書きされるため置かない。
    robots: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/onboarding',
          '/channels',
          '/forms',
          '/submissions',
          '/messages',
        ],
      },
    ],
  }) as unknown as Plugin,
];

export default defineConfig({
  plugins,
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      'localhost',
    ],
  },
  // Vitest はユニットテスト (src/ 配下) のみを対象とする。
  // Playwright で動かす e2e/ は @playwright/test を直接呼ぶため vitest からは除外。
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
