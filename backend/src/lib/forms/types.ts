// Form schema definition used in forms.schema (JSONB)
import { z } from 'zod';

export const choiceStepSchema = z.object({
  type: z.literal('choice'),
  prompt: z.string(),
  field: z.string(),
  choices: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        next: z.string(),
      }),
    )
    .max(13, 'LINE quick replies support a maximum of 13 choices'),
});

export type ChoiceStep = z.infer<typeof choiceStepSchema>;

export const textStepSchema = z.object({
  type: z.literal('text'),
  prompt: z.string(),
  field: z.string(),
  next: z.string(),
});

export type TextStep = z.infer<typeof textStepSchema>;

export const endStepSchema = z.object({
  type: z.literal('end'),
  thanks: z.string(),
});

export type EndStep = z.infer<typeof endStepSchema>;

export const formStepSchema = z.discriminatedUnion('type', [
  choiceStepSchema,
  textStepSchema,
  endStepSchema,
]);

export type FormStep = z.infer<typeof formStepSchema>;

export const formSchemaSchema = z
  .object({
    startStep: z.string(),
    steps: z.record(z.string(), formStepSchema),
  })
  .refine((data) => data.startStep in data.steps, {
    message: 'startStep must exist in steps',
    path: ['startStep'],
  });

export type FormSchema = z.infer<typeof formSchemaSchema>;

export function getStep(schema: FormSchema, stepId: string): FormStep | null {
  return schema.steps[stepId] ?? null;
}

export function parseFormSchema(data: unknown): FormSchema {
  const result = formSchemaSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Invalid form schema: ${JSON.stringify(result.error.flatten())}`,
    );
  }
  return result.data;
}
