// Form schema definition used in forms.schema (JSONB)

export type ChoiceStep = {
  type: 'choice';
  prompt: string;
  field: string;
  choices: Array<{
    label: string;
    value: string;
    next: string;
  }>;
};

export type TextStep = {
  type: 'text';
  prompt: string;
  field: string;
  next: string;
};

export type EndStep = {
  type: 'end';
  thanks: string;
};

export type FormStep = ChoiceStep | TextStep | EndStep;

export type FormSchema = {
  startStep: string;
  steps: Record<string, FormStep>;
};

export function getStep(schema: FormSchema, stepId: string): FormStep | null {
  return schema.steps[stepId] ?? null;
}
