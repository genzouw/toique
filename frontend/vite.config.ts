/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import Sitemap from 'vite-plugin-sitemap';

// VITE_SITE_ORIGIN の真実の源は .env(.local) → process.env → ここのフォールバック。
// 値は src/lib/site.ts と一致させること。
const SITE_ORIGIN_FALLBACK = 'https://example.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteOrigin = env.VITE_SITE_ORIGIN ?? SITE_ORIGIN_FALLBACK;

  return {
    plugins: [
      react(),
      tailwindcss(),
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
    ],
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
  };
});
