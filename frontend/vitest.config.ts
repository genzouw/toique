import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// vite.config.ts は env 解決のため関数形式 (defineConfig(({ mode }) => ...))。
// mergeConfig は callback 形式を扱えないため、ここで test モードとして呼び出して解決する。
const resolvedViteConfig =
  typeof viteConfig === 'function'
    ? viteConfig({ mode: 'test', command: 'serve' })
    : viteConfig;

export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      globals: false,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'istanbul',
        reporter: [['text', { maxCols: 150 }], 'json-summary'],
        // include を明示し、テストから import されないファイルも分母に含める。
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/__tests__/**',
          'src/test/**',
          'src/**/*.d.ts',
          'src/main.tsx',
        ],
        // 実測 (stmts 43.74 / branches 39.61 / funcs 42.18 / lines 44.58) を下回る値。
        // 以後この値を下げず、テスト追加に合わせて引き上げる (ratchet)。
        thresholds: {
          statements: 42,
          branches: 37,
          functions: 40,
          lines: 42,
        },
      },
    },
  }),
);
