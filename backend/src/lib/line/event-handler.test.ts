import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eq, and } from 'drizzle-orm';
import db from '../../db.js';
import {
  lineChannels,
  lineUsers,
  inboundMessages,
  tenants,
  forms,
  lineSessions,
} from '../../schema.js';
import { handleLineEvent } from './event-handler.js';
import type { LineMessageEvent } from './types.js';

import { randomUUID } from 'node:crypto';

const TEST_SECRET = 'sec';
const TEST_TOKEN = 'tok';
const TEST_USER_ID = 'Uxxxxxxxxxxxxxxx';

let tenantId: string;
let currentChannelId: string;

async function getTestChannel() {
  const [c] = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.channelId, currentChannelId))
    .limit(1);
  return c!;
}

describe('handleLineEvent', () => {
  beforeEach(async () => {
    const [t] = await db
      .insert(tenants)
      .values({ name: 'Evt Test' })
      .returning({ id: tenants.id });
    tenantId = t.id;

    currentChannelId = `test-evt-channel-${randomUUID()}`;

    await db.insert(lineChannels).values({
      tenantId,
      channelId: currentChannelId,
      channelSecret: TEST_SECRET,
      channelAccessToken: TEST_TOKEN,
      displayName: 'EvtTest',
      isActive: true,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    // cascade で lineChannels, lineUsers, inboundMessages も消える
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('saves a text message without auto-reply when no form matches', async () => {
    const channel = await getTestChannel();
    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-1',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm1', text: 'hello world' },
    };

    await handleLineEvent(channel, event);

    const saved = await db
      .select()
      .from(inboundMessages)
      .where(eq(inboundMessages.lineChannelId, channel.id));
    expect(saved).toHaveLength(1);
    expect(saved[0].eventType).toBe('message');
    expect(saved[0].messageType).toBe('text');
    expect(saved[0].text).toBe('hello world');

    // エコー応答は廃止済み — フォーム未マッチ時は自動返信しない
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('upserts a line_user record on first message', async () => {
    const channel = await getTestChannel();
    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-2',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm2', text: 'hi' },
    };

    await handleLineEvent(channel, event);

    const users = await db
      .select()
      .from(lineUsers)
      .where(eq(lineUsers.lineChannelId, channel.id));
    expect(users).toHaveLength(1);
    expect(users[0].lineUserId).toBe(TEST_USER_ID);
  });

  it('abandons active session on cancellation keywords (Fluid Context Switching)', async () => {
    const channel = await getTestChannel();

    // Create a line user manually
    const [lineUser] = await db
      .insert(lineUsers)
      .values({
        lineChannelId: channel.id,
        lineUserId: TEST_USER_ID,
      })
      .returning();

    // Create a dummy form
    const [form] = await db
      .insert(forms)
      .values({
        tenantId,
        lineChannelId: channel.id,
        name: 'Test Form',
        status: 'published',
        triggerKeyword: 'start',
        schema: {
          steps: { s1: { type: 'text', field: 'f1', next: 'end' } },
          startStep: 's1',
        },
      })
      .returning();

    // Start an active session
    await db.insert(lineSessions).values({
      lineUserId: lineUser.id,
      formId: form.id,
      currentStep: 's1',
      status: 'in_progress',
      answers: {},
      expiresAt: new Date(Date.now() + 100000),
    });

    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-cancel',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm-cancel', text: ' キャンセル ' },
    };

    await handleLineEvent(channel, event);

    const session = await db
      .select()
      .from(lineSessions)
      .where(eq(lineSessions.lineUserId, lineUser.id));
    expect(session[0].status).toBe('abandoned');

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const reqBody = JSON.parse(callArgs[1].body);
    expect(reqBody.replyToken).toBe('rt-cancel');
    expect(reqBody.messages[0].text).toBe('現在の入力をキャンセルしました。');
  });

  it('abandons active session and starts a new one when a different form trigger is sent (Global Intent Preemption)', async () => {
    const channel = await getTestChannel();

    // Create a line user manually
    const [lineUser] = await db
      .insert(lineUsers)
      .values({
        lineChannelId: channel.id,
        lineUserId: TEST_USER_ID,
      })
      .returning();

    // Create Form A (Active)
    const [formA] = await db
      .insert(forms)
      .values({
        tenantId,
        lineChannelId: channel.id,
        name: 'Form A',
        status: 'published',
        triggerKeyword: 'form A',
        schema: {
          steps: {
            a1: { type: 'text', field: 'f1', prompt: 'Prompt A', next: 'end' },
          },
          startStep: 'a1',
        },
      })
      .returning();

    // Create Form B (New Intent)
    const [formB] = await db
      .insert(forms)
      .values({
        tenantId,
        lineChannelId: channel.id,
        name: 'Form B',
        status: 'published',
        triggerKeyword: 'form B',
        schema: {
          steps: {
            b1: { type: 'text', field: 'f2', prompt: 'Prompt B', next: 'end' },
          },
          startStep: 'b1',
        },
      })
      .returning();

    // Start an active session for Form A
    await db.insert(lineSessions).values({
      lineUserId: lineUser.id,
      formId: formA.id,
      currentStep: 'a1',
      status: 'in_progress',
      answers: {},
      expiresAt: new Date(Date.now() + 100000),
    });

    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-switch',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm-switch', text: ' form B ' },
    };

    await handleLineEvent(channel, event);

    // Verify Session A is abandoned
    const [sA] = await db
      .select()
      .from(lineSessions)
      .where(
        and(
          eq(lineSessions.lineUserId, lineUser.id),
          eq(lineSessions.formId, formA.id),
        ),
      );

    // Verify Session B is in progress
    const [sB] = await db
      .select()
      .from(lineSessions)
      .where(
        and(
          eq(lineSessions.lineUserId, lineUser.id),
          eq(lineSessions.formId, formB.id),
        ),
      );

    expect(sA?.status).toBe('abandoned');
    expect(sB?.status).toBe('in_progress');
    expect(sB?.currentStep).toBe('b1');

    // Verify reply for new form is sent
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    const reqBody = JSON.parse(callArgs[1].body);
    expect(reqBody.replyToken).toBe('rt-switch');
    expect(reqBody.messages[0].text).toBe('Prompt B');
  });
});
