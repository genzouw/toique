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
    },
  }),
);
