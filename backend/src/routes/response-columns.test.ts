import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import {
  contacts,
  forms,
  lineChannels,
  lineUsers,
  submissions,
  tenantMembers,
  tenants,
  users,
} from '../schema.js';

// ルートが列を明示して取得するため、列の列挙漏れでレスポンスからキーが消えないことを固定する（Issue #1135）。

const authUser = vi.hoisted(() => ({ id: '', name: 'T', email: '' }));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: async (
    c: { set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('authUser', authUser);
    await next();
  },
}));
vi.mock('../auth/better-auth.js', () => ({
  auth: { api: { getSession: async () => null } },
}));
vi.mock('../lib/notify-contact.js', () => ({
  notifyContact: async () => {},
}));

const { default: formsRoute } = await import('./forms.js');
const { default: submissionsRoute } = await import('./submissions.js');
const { default: onboardingRoute } = await import('./onboarding.js');
const { default: contactRoute } = await import('./contact.js');
const { default: adminContactsRoute } = await import('./admin/contacts.js');

const FORM_KEYS = [
  'id',
  'tenantId',
  'lineChannelId',
  'name',
  'status',
  'triggerKeyword',
  'schema',
  'version',
  'createdAt',
  'updatedAt',
];

const schema = {
  startStep: 'note',
  steps: {
    note: { type: 'text', prompt: '備考', field: 'note', next: 'complete' },
    complete: { type: 'end', thanks: 'ありがとう' },
  },
};

let tenantId: string;
let channelRowId: string;
let formId: string;

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('tenant', {
      id: tenantId,
      name: 'Columns Test',
      plan: 'free',
      role: 'admin',
      unlimited: true,
    });
    await next();
  });
  app.route('/forms', formsRoute);
  app.route('/submissions', submissionsRoute);
  app.route('/onboarding', onboardingRoute);
  app.route('/contact', contactRoute);
  app.route('/admin/contacts', adminContactsRoute);
  return app;
}

function send(method: string, path: string, body: unknown) {
  return buildApp().request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function keysOf(res: Response) {
  return Object.keys((await res.json()) as object).sort();
}

describe('ルートのレスポンスに含まれる列', () => {
  beforeEach(async () => {
    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Columns Test' })
      .returning({ id: tenants.id });
    tenantId = tenant!.id;

    const [channel] = await db
      .insert(lineChannels)
      .values({
        tenantId,
        channelId: `columns-test-${randomUUID()}`,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Columns Test',
      })
      .returning({ id: lineChannels.id });
    channelRowId = channel!.id;

    const [form] = await db
      .insert(forms)
      .values({ tenantId, lineChannelId: channelRowId, name: 'f', schema })
      .returning({ id: forms.id });
    formId = form!.id;

    authUser.email = `columns-${randomUUID()}@example.test`;
    const [user] = await db
      .insert(users)
      .values({ name: 'T', email: authUser.email })
      .returning({ id: users.id });
    authUser.id = user!.id;
  });

  afterEach(async () => {
    const [member] = await db
      .select({ tenantId: tenantMembers.tenantId })
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, authUser.id));
    if (member) {
      await db.delete(tenants).where(eq(tenants.id, member.tenantId));
    }
    await db.delete(users).where(eq(users.id, authUser.id));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('GET /forms/:id はフォームの全項目を返す', async () => {
    const res = await buildApp().request(`/forms/${formId}`);
    expect(res.status).toBe(200);
    expect(await keysOf(res)).toEqual([...FORM_KEYS].sort());
  });

  it('POST /forms は作成したフォームの全項目を返す', async () => {
    const res = await send('POST', '/forms', {
      name: 'n',
      lineChannelId: channelRowId,
      schema,
    });
    expect(res.status).toBe(201);
    expect(await keysOf(res)).toEqual([...FORM_KEYS].sort());
  });

  it('POST /forms はテナントに無い lineChannelId を 400 で弾く', async () => {
    const res = await send('POST', '/forms', {
      name: 'n',
      lineChannelId: randomUUID(),
      schema,
    });
    expect(res.status).toBe(400);
  });

  it('PATCH /forms/:id は更新したフォームの全項目を返す', async () => {
    const res = await send('PATCH', `/forms/${formId}`, { name: 'renamed' });
    expect(res.status).toBe(200);
    expect(await keysOf(res)).toEqual([...FORM_KEYS].sort());
  });

  it('GET /submissions は回答の全項目を返す', async () => {
    const [lineUser] = await db
      .insert(lineUsers)
      .values({ lineChannelId: channelRowId, lineUserId: 'U-columns' })
      .returning({ id: lineUsers.id });
    await db.insert(submissions).values({
      tenantId,
      formId,
      lineUserId: lineUser!.id,
      answers: { note: 'x' },
    });

    const res = await buildApp().request('/submissions');
    expect(res.status).toBe(200);
    const [row] = (await res.json()) as object[];
    expect(Object.keys(row!).sort()).toEqual(
      [
        'id',
        'tenantId',
        'formId',
        'lineUserId',
        'answers',
        'status',
        'submittedAt',
      ].sort(),
    );
  });

  it('POST /onboarding は作成したテナントを返し、2 回目は 409 にする', async () => {
    const res = await send('POST', '/onboarding', { tenantName: '新テナント' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      tenant: {
        id: expect.any(String),
        name: '新テナント',
        plan: 'free',
        role: 'admin',
      },
    });

    const again = await send('POST', '/onboarding', { tenantName: '別名' });
    expect(again.status).toBe(409);
  });

  it('POST /contact は ok と id を返し、PATCH /admin/contacts/:id は全項目を返す', async () => {
    const res = await send('POST', '/contact', {
      name: 'n',
      email: 'n@example.test',
      category: 'other',
      subject: 's',
      body: 'b',
    });
    expect(res.status).toBe(200);
    const created = (await res.json()) as { ok: boolean; id: string };
    expect(created).toEqual({ ok: true, id: expect.any(String) });

    try {
      const patched = await send('PATCH', `/admin/contacts/${created.id}`, {
        status: 'done',
      });
      expect(patched.status).toBe(200);
      expect(await keysOf(patched)).toEqual(
        [
          'id',
          'userId',
          'tenantId',
          'name',
          'email',
          'category',
          'subject',
          'body',
          'url',
          'status',
          'userAgent',
          'ipAddress',
          'createdAt',
          'updatedAt',
        ].sort(),
      );
    } finally {
      await db.delete(contacts).where(eq(contacts.id, created.id));
    }
  });
});
