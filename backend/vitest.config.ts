import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // oven/bun:1.3.14-alpine 上で istanbul 計装後に `import { z } from 'zod'` が
    // undefined になる Bun × Zod 4 の ESM 解決バグへの回避策。zod を vite 側で
    // インラインバンドルさせて Bun のネイティブ ESM 解決を経由させない。
    server: {
      deps: {
        inline: ['zod'],
      },
    },
    coverage: {
      provider: 'istanbul',
      reporter: [['text', { maxCols: 150 }], 'json-summary'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 55,
        branches: 60,
        statements: 70,
      },
    },
  },
});
