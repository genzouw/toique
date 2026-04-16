import type { LineMessage } from '../line/client.js';
import type { FormStep } from './types.js';

// postback data 形式: step=<stepId>&value=<value>
export function encodePostbackData(stepId: string, value: string): string {
  return `step=${encodeURIComponent(stepId)}&value=${encodeURIComponent(value)}`;
}

export function parsePostbackData(
  data: string,
): { stepId: string; value: string } | null {
  const params = new URLSearchParams(data);
  const stepId = params.get('step');
  const value = params.get('value');
  if (!stepId || value === null) return null;
  return { stepId, value };
}

export function buildStepMessages(
  stepId: string,
  step: FormStep,
): LineMessage[] {
  if (step.type === 'choice') {
    return [
      {
        type: 'text',
        text: step.prompt,
        quickReply: {
          items: step.choices.slice(0, 13).map((c) => ({
            type: 'action' as const,
            action: {
              type: 'postback' as const,
              label: c.label.slice(0, 20),
              data: encodePostbackData(stepId, c.value),
              displayText: c.label,
            },
          })),
        },
      },
    ];
  }

  if (step.type === 'text') {
    return [{ type: 'text', text: step.prompt }];
  }

  if (step.type === 'end') {
    return [{ type: 'text', text: step.thanks }];
  }

  return [];
}
