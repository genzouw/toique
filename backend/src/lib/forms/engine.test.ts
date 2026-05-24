import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import db from '../../db.js';
import {
  tenants,
  lineChannels,
  lineUsers,
  forms,
  lineSessions,
  submissions,
} from '../../schema.js';
import {
  startSession,
  advanceSession,
  findActiveSession,
  findFormByTrigger,
} from './engine.js';
import { encodePostbackData } from './messages.js';
import type { FormSchema } from './types.js';

const sampleSchema: FormSchema = {
  startStep: 'category',
  steps: {
    category: {
      type: 'choice',
      prompt: 'カテゴリを選んでください',
      field: 'category',
      choices: [
        { label: '時計', value: 'watch', next: 'brand' },
        { label: 'バッグ', value: 'bag', next: 'brand' },
      ],
    },
    brand: {
      type: 'text',
      prompt: 'ブランド名を教えてください',
      field: 'brand',
      next: 'complete',
    },
    complete: {
      type: 'end',
      thanks: 'ありがとうございました',
    },
  },
};

let tenantId: string;
let channelRowId: string;
let lineUserRowId: string;
let formId: string;
let formId2: string;

async function seed() {
  const [t] = await db
    .insert(tenants)
    .values({ name: 'Engine Test' })
    .returning({ id: tenants.id });
  tenantId = t.id;

  const [ch] = await db
    .insert(lineChannels)
    .values({
      tenantId,
      channelId: 'engine-test-ch',
      channelSecret: 's',
      channelAccessToken: 't',
      displayName: 'Engine Test',
    })
    .returning({ id: lineChannels.id });
  channelRowId = ch.id;

  const [u] = await db
    .insert(lineUsers)
    .values({
      lineChannelId: channelRowId,
      lineUserId: 'U-engine-test',
    })
    .returning({ id: lineUsers.id });
  lineUserRowId = u.id;

  const [f] = await db
    .insert(forms)
    .values({
      tenantId,
      lineChannelId: channelRowId,
      name: '査定',
      status: 'published',
      triggerKeyword: '査定',
      schema: sampleSchema as unknown as Record<string, unknown>,
    })
    .returning({ id: forms.id });
  formId = f.id;

  const [f2] = await db
    .insert(forms)
    .values({
      tenantId,
      lineChannelId: channelRowId,
      name: '出張査定',
      status: 'published',
      triggerKeyword: '出張査定',
      schema: sampleSchema as unknown as Record<string, unknown>,
    })
    .returning({ id: forms.id });
  formId2 = f2.id;
}

async function cleanup() {
  // cascade により lineChannels, lineUsers, forms, sessions, submissions も消える
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}

describe('forms engine', () => {
  beforeEach(async () => {
    await seed();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('findFormByTrigger returns a form on trigger keyword match', async () => {
    const form = await findFormByTrigger(channelRowId, '査定');
    expect(form?.id).toBe(formId);
  });

  it('findFormByTrigger returns null for non-matching text', async () => {
    const form = await findFormByTrigger(channelRowId, 'こんにちは');
    expect(form).toBeNull();
  });

  it('findFormByTrigger supports partial match', async () => {
    const form = await findFormByTrigger(channelRowId, '査定をお願いします');
    expect(form?.id).toBe(formId);
  });

  it('findFormByTrigger prioritizes longer matching keyword', async () => {
    const form = await findFormByTrigger(channelRowId, '出張査定をお願いします');
    expect(form?.id).toBe(formId2);
  });

  it('startSession creates a session and returns the first step as Quick Reply', async () => {
    const [lineUser] = await db
      .select()
      .from(lineUsers)
      .where(eq(lineUsers.id, lineUserRowId));
    const [form] = await db.select().from(forms).where(eq(forms.id, formId));
    const outcome = await startSession(lineUser, form);

    expect(outcome.completed).toBe(false);
    expect(outcome.replyMessages).toHaveLength(1);
    const msg = outcome.replyMessages[0];
    expect(msg.text).toBe('カテゴリを選んでください');
    expect(msg.quickReply?.items).toHaveLength(2);

    const active = await findActiveSession(lineUserRowId);
    expect(active?.session.currentStep).toBe('category');
    expect(active?.session.status).toBe('in_progress');
  });

  it('advanceSession moves from choice -> text -> end and writes submission', async () => {
    const [lineUser] = await db
      .select()
      .from(lineUsers)
      .where(eq(lineUsers.id, lineUserRowId));
    const [form] = await db.select().from(forms).where(eq(forms.id, formId));
    await startSession(lineUser, form);

    // 1. choice 回答 (postback)
    let active = await findActiveSession(lineUserRowId);
    expect(active).not.toBeNull();
    const r1 = await advanceSession(lineUser, form, active!.session, {
      kind: 'postback',
      postbackData: encodePostbackData('category', 'watch'),
    });
    expect(r1.completed).toBe(false);
    expect(r1.replyMessages[0].text).toBe('ブランド名を教えてください');

    // 2. text 回答
    active = await findActiveSession(lineUserRowId);
    const r2 = await advanceSession(lineUser, form, active!.session, {
      kind: 'text',
      text: 'ロレックス',
    });
    expect(r2.completed).toBe(true);
    expect(r2.replyMessages[0].text).toBe('ありがとうございました');

    // submission が作られている
    const subs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.formId, formId));
    expect(subs).toHaveLength(1);
    expect(subs[0].answers).toEqual({
      category: 'watch',
      brand: 'ロレックス',
    });

    // session は completed に
    const [session] = await db
      .select()
      .from(lineSessions)
      .where(eq(lineSessions.lineUserId, lineUserRowId));
    expect(session.status).toBe('completed');
  });

  it('advanceSession re-sends the same choice prompt if user typed text', async () => {
    const [lineUser] = await db
      .select()
      .from(lineUsers)
      .where(eq(lineUsers.id, lineUserRowId));
    const [form] = await db.select().from(forms).where(eq(forms.id, formId));
    await startSession(lineUser, form);
    const active = await findActiveSession(lineUserRowId);

    const r = await advanceSession(lineUser, form, active!.session, {
      kind: 'text',
      text: '自由文',
    });
    expect(r.completed).toBe(false);
    expect(r.replyMessages[0].text).toBe('カテゴリを選んでください');
  });
});
