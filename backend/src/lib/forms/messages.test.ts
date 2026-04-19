import { describe, it, expect } from 'vitest';
import {
  parsePostbackData,
  encodePostbackData,
  buildStepMessages,
} from './messages.js';
import type { FormStep } from './types.js';

describe('messages', () => {
  describe('parsePostbackData', () => {
    it('should parse valid postback data', () => {
      expect(parsePostbackData('step=1&value=yes')).toEqual({
        stepId: '1',
        value: 'yes',
      });
    });

    it('should return null for missing step parameter', () => {
      expect(parsePostbackData('value=yes')).toBeNull();
    });

    it('should return null for missing value parameter', () => {
      expect(parsePostbackData('step=1')).toBeNull();
    });

    it('should return null for empty step parameter', () => {
      expect(parsePostbackData('step=&value=yes')).toBeNull();
    });

    it('should parse empty value parameter correctly', () => {
      expect(parsePostbackData('step=1&value=')).toEqual({
        stepId: '1',
        value: '',
      });
    });

    it('should return null for empty string', () => {
      expect(parsePostbackData('')).toBeNull();
    });

    it('should return null for invalid string', () => {
      expect(parsePostbackData('garbage string')).toBeNull();
    });
  });

  describe('encodePostbackData', () => {
    it('should encode stepId and value correctly', () => {
      expect(encodePostbackData('1', 'yes')).toBe('step=1&value=yes');
    });

    it('should handle special characters', () => {
      expect(encodePostbackData('step 1', 'value & yes')).toBe(
        'step=step%201&value=value%20%26%20yes'
      );
    });
  });

  describe('buildStepMessages', () => {
    it('should build text step message', () => {
      const step: FormStep = {
        type: 'text',
        prompt: 'What is your name?',
        variable: 'name',
      };
      expect(buildStepMessages('step1', step)).toEqual([
        { type: 'text', text: 'What is your name?' },
      ]);
    });

    it('should build end step message', () => {
      const step: FormStep = {
        type: 'end',
        thanks: 'Thank you for your submission!',
      };
      expect(buildStepMessages('step2', step)).toEqual([
        { type: 'text', text: 'Thank you for your submission!' },
      ]);
    });

    it('should build choice step message', () => {
      const step: FormStep = {
        type: 'choice',
        prompt: 'Select an option',
        variable: 'option',
        choices: [
          { label: 'Option A', value: 'a' },
          { label: 'Option B', value: 'b' },
        ],
      };
      expect(buildStepMessages('step3', step)).toEqual([
        {
          type: 'text',
          text: 'Select an option',
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: 'Option A',
                  data: 'step=step3&value=a',
                  displayText: 'Option A',
                },
              },
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: 'Option B',
                  data: 'step=step3&value=b',
                  displayText: 'Option B',
                },
              },
            ],
          },
        },
      ]);
    });

    it('should truncate labels to 20 chars and slice choices to 13 items', () => {
      const step: FormStep = {
        type: 'choice',
        prompt: 'Select an option',
        variable: 'option',
        choices: Array.from({ length: 15 }, (_, i) => ({
          label: `This is a very long option label ${i}`,
          value: `${i}`,
        })),
      };

      const result = buildStepMessages('step4', step);
      expect(result).toHaveLength(1);

      // Should have only 13 items because of .slice(0, 13)
      // @ts-ignore
      expect(result[0].quickReply.items).toHaveLength(13);

      // Should truncate label to 20 chars
      // @ts-ignore
      expect(result[0].quickReply.items[0].action.label).toBe('This is a very long ');
      // @ts-ignore
      expect(result[0].quickReply.items[0].action.label).toHaveLength(20);

      // But displayText is not truncated
      // @ts-ignore
      expect(result[0].quickReply.items[0].action.displayText).toBe('This is a very long option label 0');
    });
  });
});
