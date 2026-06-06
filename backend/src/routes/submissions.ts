import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import db from '../db.js';
import { forms, submissions } from '../schema.js';
import { type FormStep, parseFormSchema } from '../lib/forms/types.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.tenantId, tenant.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(100);
  return c.json(rows);
});

/**
 * CSV エクスポート (フォーム指定必須)
 * GET /api/v1/submissions/export?formId=<uuid>
 *
 * ヘッダ: 受信日時 / ステータス / <form.schemaから抽出した field の順>
 * 文字コード: UTF-8 (BOM付き) → Excel で開いても文字化けしない
 */
app.get('/export', async (c) => {
  const tenant = c.get('tenant');
  const formId = c.req.query('formId');
  if (!formId) return c.text('formId query parameter is required', 400);

  // フォーム取得 (テナントスコープ)
  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.tenantId, tenant.id)))
    .limit(1);
  if (!form) return c.text('Form not found', 404);

  // スキーマから出現順に field を抽出 (重複除去)
  const schema = parseFormSchema(form.schema);
  const fieldKeySet = new Set<string>();
  const startStep = schema.startStep;
  const visited = new Set<string>();
  const visitOrder: string[] = [];

  // 1. startStep から next/choices[].next の順にトラバースして出現順を作る
  const queue: string[] = [startStep];
  while (queue.length > 0) {
    const stepId = queue.shift()!;
    if (visited.has(stepId)) continue;
    visited.add(stepId);
    visitOrder.push(stepId);
    const step = schema.steps?.[stepId] as FormStep | undefined;
    if (!step) continue;
    if (step.type === 'text') {
      if (step.field) fieldKeySet.add(step.field);
      if (step.next) queue.push(step.next);
    } else if (step.type === 'choice') {
      if (step.field) fieldKeySet.add(step.field);
      for (const ch of step.choices ?? []) {
        if (ch.next) queue.push(ch.next);
      }
    }
    // end step は field 無し
  }

  // 2. トラバース外のステップ (孤立) も最後にカバー
  for (const [stepId, step] of Object.entries(schema.steps ?? {})) {
    if (visited.has(stepId)) continue;
    if (step.type === 'text' || step.type === 'choice') {
      if (step.field) fieldKeySet.add(step.field);
    }
  }

  const fieldKeys = Array.from(fieldKeySet);

  // submissions 取得
  const rows = await db
    .select()
    .from(submissions)
    .where(
      and(eq(submissions.formId, formId), eq(submissions.tenantId, tenant.id)),
    )
    .orderBy(desc(submissions.submittedAt));

  // CSV 組み立て
  const header = ['受信日時', 'ステータス', ...fieldKeys];
  const lines: string[] = [header.map(escapeCsv).join(',')];
  for (const row of rows) {
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    const values: string[] = [
      escapeCsv(row.submittedAt.toISOString()),
      escapeCsv(row.status),
    ];
    for (const k of fieldKeys) {
      values.push(escapeCsv(toCsvValue(answers[k])));
    }
    lines.push(values.join(','));
  }
  const csv = '\uFEFF' + lines.join('\r\n');

  const filename = buildFilename(form.name);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header(
    'Content-Disposition',
    `attachment; filename="${asciiFallback(form.name)}.csv"; filename*=UTF-8''${filename}`,
  );
  return c.body(csv);
});

const CSV_ESCAPE_TEST = /[",\r\n]/;
const CSV_ESCAPE_REPLACE = /"/g;

// 現スキーマ (forms/types.ts) では answers 値は実質的に string のみだが、
// 将来 number/boolean 型 step を追加した際に escapeCsv が型を保持したまま
// 受け取れるよう契約を明示する
export type CsvExportableValue = string | number | boolean | null | undefined;

// answers は jsonb (unknown) のため、型アサーションではなく実行時の型ガードで
// CsvExportableValue に正規化する。想定外の object / array は JSON 文字列化
// してフォールバック (CSV 上で値が失われないようにする)。
export function toCsvValue(value: unknown): CsvExportableValue {
  if (value == null) return undefined;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return JSON.stringify(value);
}

export function escapeCsv(value: CsvExportableValue): string {
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return String(value);
  if (value == null) return '';

  let sanitized = value;
  // 防御的対策: CSVインジェクション (式インジェクション) を防ぐため、
  // 特定の文字で始まる場合はシングルクォートを前置する
  if (/^\s*[=+\-@\t\r\n]/.test(sanitized)) {
    sanitized = "'" + sanitized;
  }

  if (CSV_ESCAPE_TEST.test(sanitized)) {
    return '"' + sanitized.replace(CSV_ESCAPE_REPLACE, '""') + '"';
  }
  return sanitized;
}

function asciiFallback(name: string): string {
  // 非ASCII文字を '_' に置換したフォールバック名 (互換性目的)
  return name.replace(/[^\x20-\x7E]/g, '_') || 'submissions';
}

function buildFilename(formName: string): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safe = formName.replace(/[\\/:*?"<>|]/g, '_');
  return encodeURIComponent(`${safe}_${stamp}.csv`);
}

export default app;
