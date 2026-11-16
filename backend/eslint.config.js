import js from '@eslint/js';
import drizzle from 'eslint-plugin-drizzle';
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
  {
    // `.where(...)` の無い update・delete は全行が対象になり、他テナントの行まで書き換えるため禁止する（Issue #1065）。
    // ルールはレシーバの変数名だけで判定するため、drizzleObjectName を絞らないと
    // Map#delete や Hono の app.delete(...) まで誤検知する。
    // Drizzle のインスタンスを db・tx 以外の名前で受け取る関数を書いたときは、ここに名前を追加する。
    files: ['src/**/*.ts'],
    plugins: { drizzle },
    rules: {
      'drizzle/enforce-delete-with-where': [
        'error',
        { drizzleObjectName: ['db', 'tx'] },
      ],
      'drizzle/enforce-update-with-where': [
        'error',
        { drizzleObjectName: ['db', 'tx'] },
      ],
    },
  },
);
