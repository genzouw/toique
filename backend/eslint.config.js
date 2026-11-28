import js from '@eslint/js';
import drizzle from 'eslint-plugin-drizzle';
import vitest from '@vitest/eslint-plugin';
import tseslint from 'typescript-eslint';

// 引数の無い select()・returning() はテーブルの全列を返す。秘匿列がレスポンスに混入しないよう、ルートでは列を明示させる（#488）。
const implicitSelect = [
  {
    selector:
      "CallExpression[arguments.length=0]:matches([callee.computed=false][callee.property.name='select'], [callee.property.value='select'], [callee.property.expressions.length=0][callee.property.quasis.0.value.cooked='select'])",
    message:
      'select() は全列を返します。レスポンスに載せる列を select({ ... }) で明示してください。',
  },
  {
    selector:
      "CallExpression[arguments.length=0]:matches([callee.computed=false][callee.property.name='returning'], [callee.property.value='returning'], [callee.property.expressions.length=0][callee.property.quasis.0.value.cooked='returning'])",
    message:
      'returning() は全列を返します。必要な列を returning({ ... }) で明示してください。',
  },
];

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
  {
    // リクエストボディは zValidator で検証してから受け取る（Issue #1124）。
    // c.req.json() の形だけを検出する。c.req.raw.json() や c.req.text() + JSON.parse は検出できない。
    // webhooks は署名検証のため生のボディを読む。contact 系は honeypot より前に検証が走らないよう手書きの検証を残す。
    files: ['src/routes/**/*.ts'],
    ignores: [
      'src/routes/**/*.test.ts',
      'src/routes/webhooks/**',
      'src/routes/contact.ts',
      'src/routes/admin/contacts.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='json'][callee.object.property.name='req']",
          message:
            'リクエストボディは jsonBody() で検証し、c.req.valid("json") で受け取ってください。',
        },
        ...implicitSelect,
      ],
    },
  },
  {
    // c.req.json() の禁止から除外しているルートにも、全列取得の禁止だけは適用する（Issue #1135）。
    // no-restricted-syntax は後ろのブロックが前の設定を置き換えるため、対象は上のブロックと重ねない。
    files: [
      'src/routes/webhooks/**/*.ts',
      'src/routes/contact.ts',
      'src/routes/admin/contacts.ts',
    ],
    ignores: ['src/routes/**/*.test.ts'],
    rules: { 'no-restricted-syntax': ['error', ...implicitSelect] },
  },
  {
    // .only の混入・await の無い expect・アサーション無しのテストを検出する（Issue #1086）。
    files: ['src/**/*.test.ts'],
    ...vitest.configs.recommended,
  },
);
