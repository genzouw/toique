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
  const fieldKeys: string[] = [];
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
      if (step.field && !fieldKeys.includes(step.field))
        fieldKeys.push(step.field);
      if (step.next) queue.push(step.next);
    } else if (step.type === 'choice') {
      if (step.field && !fieldKeys.includes(step.field))
        fieldKeys.push(step.field);
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
      if (step.field && !fieldKeys.includes(step.field))
        fieldKeys.push(step.field);
    }
  }

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
    const values = [
      new Date(row.submittedAt).toISOString(),
      row.status,
      ...fieldKeys.map((k) => String(answers[k] ?? '')),
    ];
    lines.push(values.map(escapeCsv).join(','));
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

export function escapeCsv(value: string | number | null | undefined): string {
  if (typeof value === 'number') return String(value);
  if (value == null) return '';
  let strValue = value;
  // Prevent CSV formula injection by prefixing with a single quote
  if (/^[=+\-@\t\r\n]/.test(strValue)) {
    strValue = "'" + strValue;
  }
  if (CSV_ESCAPE_TEST.test(strValue)) {
    return '"' + strValue.replace(CSV_ESCAPE_REPLACE, '""') + '"';
  }
  return strValue;
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
