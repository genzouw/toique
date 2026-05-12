import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/'] },
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
            "MemberExpression[property.name='VITE_API_URL'][object.type='MemberExpression'][object.property.name='env']",
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
