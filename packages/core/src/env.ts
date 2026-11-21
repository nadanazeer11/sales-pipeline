import { z } from 'zod'

const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined)

const schema = z.object({
  DATABASE_URL: z.string().url(),
  UNIPILE_BASE_URL: z.string().url().default('https://api.unipile.com'),
  UNIPILE_API_KEY: z.string().min(1),
  UNIPILE_SERVICE_KEY: optional,
  UNIPILE_WEBHOOK_SECRET: optional,
  PORT: z.coerce.number().int().default(8787),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  TICK_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 60 * 60_000),
  CAPTURE_WEBHOOKS: z.stringbool().default(false),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

export function env(): Env {
  cached ??= schema.parse(process.env)
  return cached
}
