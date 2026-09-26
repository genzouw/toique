import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormSchemaBuilder from './FormSchemaBuilder';

describe('FormSchemaBuilder', () => {
  const initialSchema = {
    startStep: 'step1',
    steps: {
      step1: {
        type: 'choice',
        prompt: 'プランを選択してください',
        choices: [
          { label: 'ライト', value: 'light', next: 'step2' },
          { label: 'プロ', value: 'pro', next: 'step2' },
        ],
      },
      step2: {
        type: 'text',
        prompt: 'お名前を入力してください',
        next: 'completed',
      },
      completed: {
        type: 'end',
        thanks: 'ありがとうございました。',
      },
    },
  };

  it('renders buttons with expected aria-labels for accessibility', () => {
    const handleChange = vi.fn();
    render(
      <FormSchemaBuilder schema={initialSchema} onChange={handleChange} />,
    );

    // ステップ1 (choice) の選択肢追加ボタン
    const addChoiceButton = screen.getByRole('button', {
      name: 'ステップ 1 に選択肢を追加',
    });
    expect(addChoiceButton).toBeInTheDocument();

    // 新規ステップ追加ボタン
    const addStepButton = screen.getByRole('button', {
      name: '新しいステップを追加',
    });
    expect(addStepButton).toBeInTheDocument();
  });

  it('adds a new choice when clicking add-choice button', () => {
    const handleChange = vi.fn();
    render(
      <FormSchemaBuilder schema={initialSchema} onChange={handleChange} />,
    );

    const addChoiceButton = screen.getByRole('button', {
      name: 'ステップ 1 に選択肢を追加',
    });
    fireEvent.click(addChoiceButton);

    expect(handleChange).toHaveBeenCalled();
  });

  it('adds a new step when clicking add-step button', () => {
    const handleChange = vi.fn();
    render(
      <FormSchemaBuilder schema={initialSchema} onChange={handleChange} />,
    );

    const addStepButton = screen.getByRole('button', {
      name: '新しいステップを追加',
    });
    fireEvent.click(addStepButton);

    expect(handleChange).toHaveBeenCalled();
  });
});
