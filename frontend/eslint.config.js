import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import playwright from 'eslint-plugin-playwright';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  {
    // playwright-report/, test-results/, .wrangler/ は実行成果物。
    ignores: [
      'dist/',
      'scripts/',
      'playwright-report/',
      'test-results/',
      '.wrangler/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.property.name='env']:matches([property.name='VITE_API_URL'], [property.value='VITE_API_URL'])",
          message:
            'VITE_API_URL を直接参照せず、src/lib/api-base-url.ts の API_BASE_URL を利用してください。',
        },
        // アイコンサイズの数値の直書きを止める（Issue #107、PR #134 の再発防止）。
        // size={16}・size={'16'}・size="16" を対象にし、size="sm" のような名前の指定は許す。
        // 波括弧内は raw で照合し、引用符で始まる文字列リテラルも拾う。
        {
          selector:
            "JSXAttribute[name.name='size'] > JSXExpressionContainer > Literal[raw=/^['\"]?[0-9.]/]",
          message:
            'size に数値を直接書かず、src/lib/icon-size.ts の ICON_SIZE を利用してください。',
        },
        {
          selector: "JSXAttribute[name.name='size'] > Literal[value=/^[0-9.]/]",
          message:
            'size に数値を直接書かず、src/lib/icon-size.ts の ICON_SIZE を利用してください。',
        },
      ],
    },
  },
  {
    files: ['src/lib/api-base-url.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    // .only の混入・await の無い expect・アサーション無しのテストを検出する（Issue #1086）。
    files: ['src/**/*.test.{ts,tsx}'],
    ...vitest.configs.recommended,
  },
);
