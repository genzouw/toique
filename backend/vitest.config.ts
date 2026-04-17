import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: [['text', { maxCols: 150 }], 'json-summary'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 45,
        branches: 50,
        statements: 60,
      },
    },
  },
});
