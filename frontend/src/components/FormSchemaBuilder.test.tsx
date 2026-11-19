import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormSchemaBuilder from './FormSchemaBuilder';

// テキスト → 選択肢 → 完了 の 3 ステップ
const schema = {
  startStep: 'a',
  steps: {
    a: { type: 'text', prompt: 'Q1', field: 'a', next: 'b' },
    b: {
      type: 'choice',
      prompt: 'Q2',
      field: 'b',
      choices: [{ label: 'x', value: 'x', next: 'done' }],
    },
    done: { type: 'end', thanks: 'ありがとう' },
  },
};

type BuiltSchema = {
  startStep: string;
  steps: Record<string, Record<string, unknown>>;
};

function setup() {
  const onChange =
    vi.fn<(s: { startStep: string; steps: Record<string, unknown> }) => void>();
  render(<FormSchemaBuilder schema={schema} onChange={onChange} />);
  // buildSchema は各ステップをオブジェクトで組み立てるため、検証用に型を絞る
  const lastSchema = (): BuiltSchema => {
    const call = onChange.mock.calls.at(-1);
    if (!call) throw new Error('onChange が呼ばれていない');
    return call[0] as BuiltSchema;
  };
  return { lastSchema };
}

describe('FormSchemaBuilder', () => {
  it('ステップを下へ移動すると順序が入れ替わる', () => {
    const { lastSchema } = setup();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'ステップを下へ移動' })[0]!,
    );

    const built = lastSchema();
    expect(built.startStep).toBe('b');
    expect(built.steps.b?.choices).toEqual([
      { label: 'x', value: 'x', next: 'a' },
    ]);
    expect(built.steps.a?.next).toBe('done');
  });

  it('ステップを削除すると次のステップが先頭になる', () => {
    const { lastSchema } = setup();

    fireEvent.click(
      screen.getAllByRole('button', { name: 'ステップを削除' })[0]!,
    );

    const built = lastSchema();
    expect(built.startStep).toBe('b');
    expect(Object.keys(built.steps)).toEqual(['b', 'done']);
  });

  it('ステップ名を変えると field も同じ値になる', () => {
    const { lastSchema } = setup();

    fireEvent.change(screen.getByLabelText('ステップ 1 の名前'), {
      target: { value: 'z' },
    });

    expect(lastSchema().steps.z).toMatchObject({ type: 'text', field: 'z' });
  });

  it('種類を選択肢に変えると空の選択肢が 1 つ入る', () => {
    const { lastSchema } = setup();

    fireEvent.change(screen.getByLabelText('ステップ 1 の種類'), {
      target: { value: 'choice' },
    });

    expect(lastSchema().steps.a).toMatchObject({
      type: 'choice',
      choices: [{ label: '', value: '', next: 'b' }],
    });
  });

  it('選択肢の文言を変えると value も同じ値になる', () => {
    const { lastSchema } = setup();

    fireEvent.change(screen.getByLabelText('ステップ 2 の選択肢 1'), {
      target: { value: 'y' },
    });

    expect(lastSchema().steps.b?.choices).toEqual([
      { label: 'y', value: 'y', next: 'done' },
    ]);
  });

  it('選択肢を追加・削除できる', () => {
    const { lastSchema } = setup();

    fireEvent.click(
      screen.getByRole('button', { name: 'ステップ 2 に選択肢を追加' }),
    );
    expect(lastSchema().steps.b?.choices).toHaveLength(2);

    fireEvent.click(
      screen.getAllByRole('button', { name: '選択肢を削除' })[0]!,
    );
    expect(lastSchema().steps.b?.choices).toEqual([
      { label: '', value: '', next: 'done' },
    ]);
  });
});
