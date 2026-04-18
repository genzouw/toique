import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react';

type StepType = 'choice' | 'text' | 'end';

type Choice = { label: string; value: string };

type StepDef = {
  id: string;
  type: StepType;
  prompt: string;
  field: string;
  choices: Choice[];
  thanks: string;
};

type FormSchema = {
  startStep: string;
  steps: Record<string, unknown>;
};

/**
 * ビジュアルフォームビルダー
 * ステップを上から順に定義し、最後は完了ステップで終わる
 * 内部でJSON schemaを組み立て、onChange で親に渡す
 */
export default function FormSchemaBuilder({
  schema,
  onChange,
}: {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
}) {
  const [steps, setSteps] = useState<StepDef[]>(() => parseSchema(schema));

  function update(newSteps: StepDef[]) {
    setSteps(newSteps);
    onChange(buildSchema(newSteps));
  }

  function addStep() {
    const endIdx = steps.findIndex((s) => s.type === 'end');
    const newId = `ステップ${steps.length}`;
    const newStep: StepDef = {
      id: newId,
      type: 'text',
      prompt: '',
      field: newId,
      choices: [],
      thanks: '',
    };
    const newSteps = [...steps];
    if (endIdx >= 0) {
      newSteps.splice(endIdx, 0, newStep);
    } else {
      newSteps.push(newStep);
    }
    update(newSteps);
  }

  function removeStep(idx: number) {
    if (steps[idx].type === 'end') return;
    update(steps.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    if (steps[idx].type === 'end' || steps[target].type === 'end') return;
    const newSteps = [...steps];
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    update(newSteps);
  }

  function updateStep(idx: number, patch: Partial<StepDef>) {
    const newSteps = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    // type変更時にidとfieldを同期
    if (patch.type === 'choice' && !steps[idx].choices.length) {
      newSteps[idx].choices = [{ label: '', value: '' }];
    }
    if (patch.id !== undefined) {
      newSteps[idx].field = patch.id;
    }
    update(newSteps);
  }

  function updateChoice(
    stepIdx: number,
    choiceIdx: number,
    patch: Partial<Choice>,
  ) {
    const newSteps = [...steps];
    const step = { ...newSteps[stepIdx] };
    step.choices = step.choices.map((c, i) =>
      i === choiceIdx ? { ...c, ...patch } : c,
    );
    // labelとvalueを同期
    if (patch.label !== undefined && !step.choices[choiceIdx].value) {
      step.choices[choiceIdx].value = patch.label;
    }
    newSteps[stepIdx] = step;
    update(newSteps);
  }

  function addChoice(stepIdx: number) {
    const newSteps = [...steps];
    const step = { ...newSteps[stepIdx] };
    step.choices = [...step.choices, { label: '', value: '' }];
    newSteps[stepIdx] = step;
    update(newSteps);
  }

  function removeChoice(stepIdx: number, choiceIdx: number) {
    const newSteps = [...steps];
    const step = { ...newSteps[stepIdx] };
    step.choices = step.choices.filter((_, i) => i !== choiceIdx);
    newSteps[stepIdx] = step;
    update(newSteps);
  }

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className="border border-slate-200 rounded-lg p-4 bg-slate-50"
        >
          <div className="flex items-center gap-2 mb-3">
            {step.type !== 'end' && (
              <div className="flex flex-col">
                <button
                  onClick={() => moveStep(idx, -1)}
                  disabled={idx === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="上へ"
                  aria-label="ステップを上へ移動"
                >
                  <GripVertical size={14} />
                </button>
              </div>
            )}
            <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
              {idx + 1}
            </span>

            {step.type !== 'end' ? (
              <input
                value={step.id}
                onChange={(e) => updateStep(idx, { id: e.target.value })}
                placeholder="ステップ名"
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm font-medium"
              />
            ) : (
              <span className="flex-1 text-sm font-medium text-slate-700">
                完了メッセージ
              </span>
            )}

            {step.type !== 'end' && (
              <>
                <div className="relative">
                  <select
                    value={step.type}
                    onChange={(e) =>
                      updateStep(idx, { type: e.target.value as StepType })
                    }
                    className="text-xs px-2 py-1 border border-slate-300 rounded appearance-none pr-6 bg-white"
                  >
                    <option value="text">テキスト入力</option>
                    <option value="choice">選択肢</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  />
                </div>
                <button
                  onClick={() => removeStep(idx)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="削除"
                  aria-label="ステップを削除"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>

          {step.type === 'end' ? (
            <textarea
              value={step.thanks}
              onChange={(e) => updateStep(idx, { thanks: e.target.value })}
              placeholder="お問い合わせありがとうございました。"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
            />
          ) : (
            <>
              <input
                value={step.prompt}
                onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                placeholder="LINEで表示する質問文"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />

              {step.type === 'choice' && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                  <div className="text-xs text-slate-500">選択肢</div>
                  {step.choices.map((choice, ci) => (
                    <div key={ci} className="flex gap-2 items-center">
                      <input
                        value={choice.label}
                        onChange={(e) =>
                          updateChoice(idx, ci, {
                            label: e.target.value,
                            value: e.target.value,
                          })
                        }
                        placeholder={`選択肢 ${ci + 1}`}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                      <button
                        onClick={() => removeChoice(idx, ci)}
                        disabled={step.choices.length <= 1}
                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                        aria-label="選択肢を削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addChoice(idx)}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Plus size={12} /> 選択肢を追加
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <button
        onClick={addStep}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 flex items-center justify-center gap-1"
      >
        <Plus size={14} /> ステップを追加
      </button>
    </div>
  );
}

/** JSON schema → ビジュアルビルダーの内部表現に変換 */
function parseSchema(schema: FormSchema): StepDef[] {
  const steps: StepDef[] = [];
  const visited = new Set<string>();
  const stepsMap = (schema.steps ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

  let current: string | null = schema.startStep;
  while (current && !visited.has(current)) {
    visited.add(current);
    const s: Record<string, unknown> | undefined = stepsMap[current];
    if (!s) break;

    if (s.type === 'end') {
      steps.push({
        id: current,
        type: 'end',
        prompt: '',
        field: '',
        choices: [],
        thanks: (s.thanks as string) || '',
      });
      break;
    }

    const def: StepDef = {
      id: current,
      type: s.type as StepType,
      prompt: (s.prompt as string) || '',
      field: (s.field as string) || current,
      choices: [],
      thanks: '',
    };

    if (s.type === 'choice') {
      const choices: Array<Record<string, string>> =
        (s.choices as Array<Record<string, string>>) || [];
      def.choices = choices.map((c: Record<string, string>) => ({
        label: c.label,
        value: c.value,
      }));
      // choice の next は全て同じ先を想定 (ビジュアルモードでは直列)
      current = choices[0]?.next ?? null;
    } else {
      current = (s.next as string) ?? null;
    }

    steps.push(def);
  }

  // end ステップがなければ追加
  if (!steps.some((s) => s.type === 'end')) {
    steps.push({
      id: '完了',
      type: 'end',
      prompt: '',
      field: '',
      choices: [],
      thanks: 'お問い合わせありがとうございました。',
    });
  }

  return steps;
}

/** ビジュアルビルダーの内部表現 → JSON schema に変換 */
function buildSchema(steps: StepDef[]): FormSchema {
  const result: Record<string, unknown> = {};

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const nextId = i + 1 < steps.length ? steps[i + 1].id : undefined;

    if (s.type === 'end') {
      result[s.id] = { type: 'end', thanks: s.thanks };
    } else if (s.type === 'choice') {
      result[s.id] = {
        type: 'choice',
        prompt: s.prompt,
        field: s.field || s.id,
        choices: s.choices.map((c) => ({
          label: c.label,
          value: c.value || c.label,
          next: nextId ?? '',
        })),
      };
    } else {
      result[s.id] = {
        type: 'text',
        prompt: s.prompt,
        field: s.field || s.id,
        next: nextId ?? '',
      };
    }
  }

  return {
    startStep: steps[0]?.id ?? '',
    steps: result,
  };
}
