import { and, eq, isNotNull, ne, sql, desc } from 'drizzle-orm';
import db from '../../db.js';
import {
  forms,
  lineSessions,
  submissions,
  lineUsers as lineUsersTable,
  tenants,
} from '../../schema.js';
import { checkQuota } from '../quota.js';
import { isDogfoodingTenant } from '../dogfooding.js';
import type { LineMessage } from '../line/client.js';
import { buildStepMessages, parsePostbackData } from './messages.js';
import { type FormStep, parseFormSchema } from './types.js';

type Form = typeof forms.$inferSelect;
type Session = typeof lineSessions.$inferSelect;
type LineUser = typeof lineUsersTable.$inferSelect;

const SESSION_TTL_HOURS = 72;

export type AdvanceInput = {
  kind: 'text' | 'postback';
  text?: string;
  postbackData?: string;
};

export type EngineOutcome = {
  replyMessages: LineMessage[];
  completed: boolean;
};

/**
 * 指定したフォームで新規セッションを作成し、最初の step のメッセージを返す。
 */
export async function startSession(
  lineUser: LineUser,
  form: Form,
): Promise<EngineOutcome> {
  const schema = parseFormSchema(form.schema);
  const firstStep = schema.steps[schema.startStep];
  if (!firstStep) {
    throw new Error(`Form ${form.id} has no startStep "${schema.startStep}"`);
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  // 既存セッション (abandoned/completed) があれば上書きするため onConflict で DO UPDATE
  await db
    .insert(lineSessions)
    .values({
      lineUserId: lineUser.id,
      formId: form.id,
      currentStep: schema.startStep,
      answers: {},
      status: 'in_progress',
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [lineSessions.lineUserId, lineSessions.formId],
      set: {
        currentStep: schema.startStep,
        answers: {},
        status: 'in_progress',
        startedAt: sql`now()`,
        updatedAt: sql`now()`,
        expiresAt,
      },
    });

  if (firstStep.type === 'end') {
    // startStep が end のケースは異例だが、完了として扱う
    return finalize(lineUser, form, {}, firstStep);
  }

  return {
    replyMessages: buildStepMessages(schema.startStep, firstStep),
    completed: false,
  };
}

/**
 * アクティブセッションのユーザー入力を解釈して次の step に進める。
 */
export async function advanceSession(
  lineUser: LineUser,
  form: Form,
  session: Session,
  input: AdvanceInput,
): Promise<EngineOutcome> {
  const schema = parseFormSchema(form.schema);
  const currentStep = schema.steps[session.currentStep];
  if (!currentStep) {
    throw new Error(
      `Form ${form.id} lost its step "${session.currentStep}" during session`,
    );
  }

  const answers = { ...(session.answers as Record<string, unknown>) };
  let nextStepId: string | null | undefined;

  if (currentStep.type === 'choice') {
    let choice: { value: string; next: string } | undefined;

    if (input.kind === 'postback' && input.postbackData) {
      const parsed = parsePostbackData(input.postbackData);
      if (parsed && parsed.stepId === session.currentStep) {
        choice = currentStep.choices.find((c) => c.value === parsed.value);
      }
    } else if (input.kind === 'text' && input.text) {
      // 1000年先のアプローチ: ユーザーの自然なテキスト入力を意図として解釈し、選択肢とマッチングする
      const normalizedInput = input.text.trim().toLowerCase();

      // まず完全一致を優先して判定
      choice = currentStep.choices.find(
        (c) =>
          c.label.toLowerCase() === normalizedInput ||
          c.value.toLowerCase() === normalizedInput,
      );

      // 完全一致しない場合のみ部分一致を判定（長い選択肢優先・2文字未満はスキップ）
      if (!choice) {
        const sortedChoices = [...currentStep.choices].sort(
          (a, b) => b.label.length - a.label.length,
        );
        choice = sortedChoices.find(
          (c) =>
            (c.label.length >= 2 &&
              normalizedInput.includes(c.label.toLowerCase())) ||
            (c.value.length >= 2 &&
              normalizedInput.includes(c.value.toLowerCase())),
        );
      }
    }

    if (!choice) {
      // 意図が解決できない場合のみ同じ質問を再送
      return {
        replyMessages: buildStepMessages(session.currentStep, currentStep),
        completed: false,
      };
    }

    answers[currentStep.field] = choice.value;
    nextStepId = choice.next;
  } else if (currentStep.type === 'text') {
    if (
      input.kind !== 'text' ||
      !input.text ||
      input.text.trim().length === 0
    ) {
      return {
        replyMessages: buildStepMessages(session.currentStep, currentStep),
        completed: false,
      };
    }
    answers[currentStep.field] = input.text.trim();
    nextStepId = currentStep.next;
  } else {
    // end ステップでの入力は何もしない
    return { replyMessages: [], completed: true };
  }

  if (!nextStepId) {
    throw new Error(
      `Form ${form.id} step "${session.currentStep}" has no next`,
    );
  }
  const nextStep = schema.steps[nextStepId];
  if (!nextStep) {
    throw new Error(`Form ${form.id} has no step "${nextStepId}"`);
  }

  if (nextStep.type === 'end') {
    return finalize(lineUser, form, answers, nextStep);
  }

  await db
    .update(lineSessions)
    .set({
      currentStep: nextStepId,
      answers,
      updatedAt: sql`now()`,
    })
    .where(eq(lineSessions.id, session.id));

  return {
    replyMessages: buildStepMessages(nextStepId, nextStep),
    completed: false,
  };
}

async function finalize(
  lineUser: LineUser,
  form: Form,
  answers: Record<string, unknown>,
  endStep: Extract<FormStep, { type: 'end' }>,
): Promise<EngineOutcome> {
  // サブミッション数クォータチェック (fail-open: エラー時は許可)
  try {
    const [tenant] = await db
      .select({ plan: tenants.plan })
      .from(tenants)
      .where(eq(tenants.id, form.tenantId))
      .limit(1);
    if (tenant) {
      const unlimited = await isDogfoodingTenant(form.tenantId);
      const quota = await checkQuota(
        form.tenantId,
        tenant.plan,
        'submissionsPerMonth',
        { unlimited },
      );
      if (!quota.allowed) {
        await db
          .update(lineSessions)
          .set({ status: 'completed', answers, updatedAt: sql`now()` })
          .where(
            and(
              eq(lineSessions.lineUserId, lineUser.id),
              eq(lineSessions.formId, form.id),
            ),
          );
        return {
          replyMessages: [
            {
              type: 'text',
              text: '申し訳ございません。現在、回答の受付上限に達しております。しばらく経ってから再度お試しください。',
            },
          ],
          completed: true,
        };
      }
    }
  } catch {
    // クォータチェック失敗時は受付を継続
  }

  await db.insert(submissions).values({
    tenantId: form.tenantId,
    formId: form.id,
    lineUserId: lineUser.id,
    answers,
    status: 'new',
  });

  await db
    .update(lineSessions)
    .set({
      status: 'completed',
      answers,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(lineSessions.lineUserId, lineUser.id),
        eq(lineSessions.formId, form.id),
      ),
    );

  return {
    replyMessages: [{ type: 'text', text: endStep.thanks }],
    completed: true,
  };
}

/**
 * LINEユーザーの in_progress セッション + 紐付く form を取得。無ければ null。
 */
export async function findActiveSession(lineUserRowId: string): Promise<{
  session: Session;
  form: Form;
} | null> {
  const rows = await db
    .select({ session: lineSessions, form: forms })
    .from(lineSessions)
    .innerJoin(forms, eq(forms.id, lineSessions.formId))
    .where(
      and(
        eq(lineSessions.lineUserId, lineUserRowId),
        eq(lineSessions.status, 'in_progress'),
      ),
    )
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * チャネル内で trigger_keyword が入力テキストに一致する published な form を検索。
 */
export async function findFormByTrigger(
  lineChannelId: string,
  text: string,
): Promise<Form | null> {
  if (!text) return null;
  const normalized = text.trim();
  const rows = await db
    .select()
    .from(forms)
    .where(
      and(
        eq(forms.lineChannelId, lineChannelId),
        eq(forms.status, 'published'),
        isNotNull(forms.triggerKeyword),
        ne(forms.triggerKeyword, ''),
        sql`strpos(${normalized}, ${forms.triggerKeyword}) > 0`,
      ),
    )
    .orderBy(desc(sql`length(${forms.triggerKeyword})`), desc(forms.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
