import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // 型情報が必要なルールは tsconfig.json の include（src/**/*）に入るファイルに限る。
    // drizzle.config.ts・vitest.config.ts・eslint.config.js は tsconfig の対象外のため除く。
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // await 漏れ・Promise の誤用を検出する（Issue #1074）。
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
);
