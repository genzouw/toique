import { z } from 'zod';

// Form schema definition used in forms.schema (JSONB)

export const ChoiceStepSchema = z.object({
  type: z.literal('choice'),
  prompt: z.string(),
  field: z.string(),
  choices: z
    .array(
      z.object({
        label: z.string().max(20, 'Label must be 20 characters or less'),
        value: z.string(),
        next: z.string(),
      }),
    )
    .max(13, 'LINE quick replies support a maximum of 13 choices'),
});

export type ChoiceStep = z.infer<typeof ChoiceStepSchema>;

export const TextStepSchema = z.object({
  type: z.literal('text'),
  prompt: z.string(),
  field: z.string(),
  next: z.string(),
});

export type TextStep = z.infer<typeof TextStepSchema>;

export const EndStepSchema = z.object({
  type: z.literal('end'),
  thanks: z.string(),
});

export type EndStep = z.infer<typeof EndStepSchema>;

export const FormStepSchema = z.discriminatedUnion('type', [
  ChoiceStepSchema,
  TextStepSchema,
  EndStepSchema,
]);

export type FormStep = z.infer<typeof FormStepSchema>;

export const FormSchemaDef = z
  .object({
    startStep: z.string(),
    steps: z.record(z.string(), FormStepSchema),
  })
  .refine((data) => data.startStep in data.steps, {
    message: 'startStep must exist in steps',
    path: ['startStep'],
  });

export type FormSchema = z.infer<typeof FormSchemaDef>;

export function getStep(schema: FormSchema, stepId: string): FormStep | null {
  return schema.steps[stepId] ?? null;
}

export function parseFormSchema(data: unknown): FormSchema {
  const result = FormSchemaDef.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid form schema: ${JSON.stringify(result.error.flatten())}`,
    );
  }
  return result.data;
}
