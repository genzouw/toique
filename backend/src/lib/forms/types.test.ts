import { describe, it, expect } from 'vitest';
import { getStep, parseFormSchema, type FormSchema } from './types.js';

const validSchema: FormSchema = {
  startStep: 'q1',
  steps: {
    q1: {
      type: 'choice',
      prompt: 'Pick one',
      field: 'category',
      choices: [
        { label: 'A', value: 'a', next: 'q2' },
        { label: 'B', value: 'b', next: 'q2' },
      ],
    },
    q2: {
      type: 'text',
      prompt: 'Tell us more',
      field: 'detail',
      next: 'end',
    },
    end: { type: 'end', thanks: 'Thanks!' },
  },
};

describe('getStep', () => {
  it('returns the step when it exists', () => {
    expect(getStep(validSchema, 'q1')?.type).toBe('choice');
    expect(getStep(validSchema, 'end')?.type).toBe('end');
  });

  it('returns null for an unknown step id', () => {
    expect(getStep(validSchema, 'missing')).toBeNull();
  });
});

describe('parseFormSchema', () => {
  it('parses and returns a valid schema', () => {
    const parsed = parseFormSchema(validSchema);
    expect(parsed.startStep).toBe('q1');
    expect(Object.keys(parsed.steps)).toHaveLength(3);
  });

  it('throws when startStep is missing from steps', () => {
    expect(() =>
      parseFormSchema({
        startStep: 'nope',
        steps: { end: { type: 'end', thanks: 'bye' } },
      }),
    ).toThrow(/Invalid form schema/);
  });

  it('throws when a choice has more than 13 choices', () => {
    const tooMany = {
      startStep: 'q1',
      steps: {
        q1: {
          type: 'choice',
          prompt: 'Too many',
          field: 'x',
          choices: Array.from({ length: 14 }, (_, i) => ({
            label: `L${i}`,
            value: `${i}`,
            next: 'end',
          })),
        },
        end: { type: 'end', thanks: 'thanks' },
      },
    };
    expect(() => parseFormSchema(tooMany)).toThrow(/Invalid form schema/);
  });

  it('throws when input is not an object', () => {
    expect(() => parseFormSchema('not-a-form')).toThrow(/Invalid form schema/);
  });
});
