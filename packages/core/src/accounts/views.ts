import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { type Account, accounts } from '../db/schema'
import { getUsage, listAccounts } from './accounts'
import { type Limits, limitsSchema, type Usage, warmupFactor } from './quota'

export type AccountOverview = {
  account: Account
  usage: Usage
  effectiveLimits: Limits
  warmup: number
}

export async function accountOverviews(now = new Date()): Promise<AccountOverview[]> {
  const rows = await listAccounts()
  return Promise.all(
    rows.map(async (account) => {
      const warmup = warmupFactor(account.warmupStartedAt, now)
      const scale = (n: number) => Math.floor(n * warmup)
      return {
        account,
        usage: await getUsage(account.id, now),
        warmup,
        effectiveLimits: {
          visitsPerDay: scale(account.limits.visitsPerDay),
          invitesPerDay: scale(account.limits.invitesPerDay),
          invitesPerWeek: scale(account.limits.invitesPerWeek),
          messagesPerDay: scale(account.limits.messagesPerDay),
        },
      }
    }),
  )
}

const isTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const accountSettingsSchema = z
  .object({
    timezone: z.string().refine(isTimezone, 'Unknown timezone'),
    workStartHour: z.number().int().min(0).max(23),
    workEndHour: z.number().int().min(1).max(24),
    workDays: z.array(z.number().int().min(1).max(7)).min(1),
    minGapMinutes: z.number().int().min(0).max(120),
    maxGapMinutes: z.number().int().min(0).max(240),
    limits: limitsSchema,
    warmup: z.boolean(),
  })
  .refine((s) => s.workEndHour > s.workStartHour, {
    message: 'Working hours must end after they start',
  })
  .refine((s) => s.maxGapMinutes >= s.minGapMinutes, {
    message: 'Max gap must be at least the min gap',
  })

export type AccountSettings = z.infer<typeof accountSettingsSchema>

export async function updateAccountSettings(id: string, input: unknown) {
  const { warmup, ...settings } = accountSettingsSchema.parse(input)
  const current = await db.query.accounts.findFirst({ where: eq(accounts.id, id) })
  if (!current) throw new Error('Account not found')
  const warmupStartedAt = warmup ? (current.warmupStartedAt ?? new Date()) : null
  await db
    .update(accounts)
    .set({ ...settings, warmupStartedAt })
    .where(eq(accounts.id, id))
}
