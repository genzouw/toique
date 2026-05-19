import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // coverage-istanbul instruments zod v4 ESM named exports incorrectly; inlining forces Vite to transform it first
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
