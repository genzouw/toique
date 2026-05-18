import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    // e2e/ は Playwright のテストコードで lint 対象外（独自実行レイヤ）。
    // playwright-report/, test-results/, .wrangler/ は実行成果物。
    ignores: [
      'dist/',
      'scripts/',
      'e2e/',
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
      ],
    },
  },
  {
    files: ['src/lib/api-base-url.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
