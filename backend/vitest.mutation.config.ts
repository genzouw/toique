import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.js';

// Stryker の初期テスト実行は include に一致する全テストを走らせる。
// DB を要する統合テストを含めると DATABASE_URL の無い環境で失敗するため、
// 変異対象 (stryker.config.json の mutate) に対応するテストだけに絞る。
// mergeConfig は配列を連結してしまうため、include はスプレッドで置き換える。
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      'src/lib/line/signature.test.ts',
      'src/lib/csrf-middleware.test.ts',
      'src/lib/rate-limiter.test.ts',
      'src/lib/client-ip.test.ts',
      'src/lib/plan-config.test.ts',
      'src/lib/quota.test.ts',
    ],
  },
});
