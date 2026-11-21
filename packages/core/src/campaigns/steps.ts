import { z } from 'zod'

export const stepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('visit') }),
  z.object({
    type: z.literal('invite'),
    note: z.string().max(300).optional(),
    timeoutDays: z.number().int().positive().default(21),
  }),
  z.object({
    type: z.literal('message'),
    delayDays: z.number().nonnegative().default(0),
    template: z.string().min(1),
  }),
])

export const MAX_STEPS = 10
export const MAX_MESSAGES = 5

export const stepsSchema = z
  .array(stepSchema)
  .min(1)
  .max(MAX_STEPS)
  .refine((steps) => messageTemplates(steps).length <= MAX_MESSAGES, {
    message: `at most ${MAX_MESSAGES} message steps (1 opener + ${MAX_MESSAGES - 1} follow-ups)`,
  })
  .refine((steps) => new Set(messageTemplates(steps)).size === messageTemplates(steps).length, {
    message: 'message templates must be distinct so already-sent messages can be recognised',
  })

export type Step = z.infer<typeof stepSchema>
export type StepType = Step['type']

export type TemplateVars = Record<string, string | null | undefined>

function messageTemplates(steps: Step[]): string[] {
  return steps.flatMap((step) => (step.type === 'message' ? [step.template.trim()] : []))
}

export function campaignTexts(steps: Step[], vars: TemplateVars): string[] {
  return steps.flatMap((step) => {
    if (step.type === 'message') return [render(step.template, vars)]
    if (step.type === 'invite' && step.note) return [render(step.note, vars)]
    return []
  })
}

export function render(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key]?.trim() ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function delayMs(step: Step | undefined): number {
  return step?.type === 'message' ? step.delayDays * 86_400_000 : 0
}

export type Progress = {
  stepIndex: number
  state: 'active' | 'completed'
  nextActionAt: Date
  attempts: number
  lastError: null
}

export function advance(steps: Step[], fromIndex: number, now: Date): Progress {
  const stepIndex = fromIndex + 1
  const next = steps[stepIndex]
  return {
    stepIndex,
    state: next ? 'active' : 'completed',
    nextActionAt: new Date(now.getTime() + delayMs(next)),
    attempts: 0,
    lastError: null,
  }
}
