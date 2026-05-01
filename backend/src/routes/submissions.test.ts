import { describe, it, test, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import {
  tenants,
  lineChannels,
  lineUsers,
  forms,
  submissions,
} from '../schema.js';
import submissionsRoute, { escapeCsv } from './submissions.js';
import type { FormSchema } from '../lib/forms/types.js';

test('escapeCsv prevents formula injection', () => {
  expect(escapeCsv('=1+1')).toBe("'=" + '1+1');
  expect(escapeCsv('-1+1')).toBe("'-" + '1+1');
  expect(escapeCsv('+1+1')).toBe("'+1+1");
  expect(escapeCsv('@SUM(1,1)')).toBe('"\'@' + 'SUM(1,1)"');
  expect(escapeCsv('\t=1+1')).toBe("'\t=" + '1+1');
  expect(escapeCsv('\r=1+1')).toBe('"\'' + '\r=' + '1+1"');
  expect(escapeCsv('\n=1+1')).toBe('"\'' + '\n=' + '1+1"');
});

test('escapeCsv handles primitives and quotes', () => {
  expect(escapeCsv(null)).toBe('');
  expect(escapeCsv(undefined)).toBe('');
  expect(escapeCsv(42)).toBe('42');
  expect(escapeCsv('hello')).toBe('hello');
  expect(escapeCsv('a,b')).toBe('"a,b"');
  expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
});

const sampleSchema: FormSchema = {
  startStep: 'category',
  steps: {
    category: {
      type: 'choice',
      prompt: 'カテゴリ',
      field: 'category',
      choices: [
        { label: '時計', value: 'watch', next: 'brand' },
        { label: 'バッグ', value: 'bag', next: 'brand' },
      ],
    },
    brand: {
      type: 'text',
      prompt: 'ブランド',
      field: 'brand',
      next: 'note',
    },
    note: {
      type: 'text',
      prompt: '備考',
      field: 'note',
      next: 'complete',
    },
    // 孤立 (visited 外) ステップ — トラバース外フィールド抽出のカバレッジ用
    orphan: {
      type: 'text',
      prompt: '孤立',
      field: 'orphan',
      next: 'complete',
    },
    complete: {
      type: 'end',
      thanks: 'ありがとう',
    },
  },
};

let tenantId: string;
let otherTenantId: string;
let channelRowId: string;
let lineUserRowId: string;
let formId: string;

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('tenant', {
      id: tenantId,
      name: 'Sub Test',
      plan: 'free',
      role: 'admin',
    });
    c.set('authUser', {
      id: '00000000-0000-0000-0000-000000000000',
      email: 't@t.test',
      name: 'Test',
    });
    await next();
  });
  app.route('/api/v1/submissions', submissionsRoute);
  return app;
}

async function seed() {
  const [t1] = await db
    .insert(tenants)
    .values({ name: 'Sub Test T1' })
    .returning({ id: tenants.id });
  tenantId = t1.id;
  const [t2] = await db
    .insert(tenants)
    .values({ name: 'Sub Test T2' })
    .returning({ id: tenants.id });
  otherTenantId = t2.id;

  const [ch] = await db
    .insert(lineChannels)
    .values({
      tenantId,
      channelId: 'sub-test-ch',
      channelSecret: 's',
      channelAccessToken: 't',
      displayName: 'Sub Test',
    })
    .returning({ id: lineChannels.id });
  channelRowId = ch.id;

  const [u] = await db
    .insert(lineUsers)
    .values({
      lineChannelId: channelRowId,
      lineUserId: 'U-sub-test',
    })
    .returning({ id: lineUsers.id });
  lineUserRowId = u.id;

  const [f] = await db
    .insert(forms)
    .values({
      tenantId,
      lineChannelId: channelRowId,
      name: '査定/2026 "α"',
      status: 'published',
      schema: sampleSchema as unknown as Record<string, unknown>,
    })
    .returning({ id: forms.id });
  formId = f.id;
}

async function cleanup() {
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  await db.delete(tenants).where(eq(tenants.id, otherTenantId));
}

describe('submissions route', () => {
  beforeEach(async () => {
    await seed();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('GET /api/v1/submissions returns rows scoped to current tenant, ordered desc', async () => {
    await db.insert(submissions).values([
      {
        tenantId,
        formId,
        lineUserId: lineUserRowId,
        answers: { category: 'watch', brand: 'Rolex' },
        status: 'new',
        submittedAt: new Date('2026-04-15T10:00:00Z'),
      },
      {
        tenantId,
        formId,
        lineUserId: lineUserRowId,
        answers: { category: 'bag', brand: 'Hermes' },
        status: 'new',
        submittedAt: new Date('2026-04-16T10:00:00Z'),
      },
    ]);

    const app = buildApp();
    const res = await app.request('/api/v1/submissions');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      answers: Record<string, string>;
    }>;
    expect(body).toHaveLength(2);
    expect(body[0].answers.brand).toBe('Hermes'); // newer first
    expect(body[1].answers.brand).toBe('Rolex');
  });

  it('GET /export returns 400 when formId is missing', async () => {
    const app = buildApp();
    const res = await app.request('/api/v1/submissions/export');
    expect(res.status).toBe(400);
  });

  it('GET /export returns 404 when form does not belong to tenant', async () => {
    const app = buildApp();
    const res = await app.request(
      `/api/v1/submissions/export?formId=00000000-0000-0000-0000-000000000000`,
    );
    expect(res.status).toBe(404);
  });

  it('GET /export returns CSV with header, formula-escaped values and Content-Disposition', async () => {
    await db.insert(submissions).values([
      {
        tenantId,
        formId,
        lineUserId: lineUserRowId,
        answers: {
          category: 'watch',
          brand: '=cmd|"/c calc"!A1', // formula injection payload
          note: 'plain',
        },
        status: 'new',
        submittedAt: new Date('2026-04-16T10:00:00Z'),
      },
      {
        tenantId,
        formId,
        lineUserId: lineUserRowId,
        answers: { category: 'bag', brand: 'Hermes' }, // note 欠落 → '' に
        status: 'done',
        submittedAt: new Date('2026-04-15T10:00:00Z'),
      },
    ]);

    const app = buildApp();
    const res = await app.request(
      `/api/v1/submissions/export?formId=${formId}`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const disposition = res.headers.get('content-disposition') ?? '';
    // 非ASCII (日本語) は '_' にフォールバック
    expect(disposition).toContain('attachment');
    expect(disposition).toMatch(/filename\*=UTF-8''/);

    const text = await res.text();
    // BOM 付き
    expect(text.charCodeAt(0)).toBe(0xfeff);

    const lines = text.slice(1).split('\r\n');
    // header + 2 行
    expect(lines).toHaveLength(3);

    // ヘッダ: 受信日時, ステータス, トラバース順 (category, brand, note), 孤立(orphan)
    expect(lines[0]).toBe('受信日時,ステータス,category,brand,note,orphan');

    // 1 行目 (新しい順) — formula injection 値はクォートと '" でエスケープ
    expect(lines[1]).toContain('"\'=cmd|""/c calc""!A1"');
    expect(lines[1]).toContain('plain');

    // 2 行目 — 欠落 note は空文字列、orphan も空
    expect(lines[2].endsWith(',,')).toBe(true);
  });
});
