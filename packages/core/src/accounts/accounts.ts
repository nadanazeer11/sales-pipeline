import { and, count, eq, gte, isNotNull, lte, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { type Account, accounts, actions } from '../db/schema'
import { defaultLimits, type Limits, type Usage } from './quota'

export type NewAccountInput = {
  unipileAccountId: string
  name: string
  timezone?: string
  limits?: Partial<Limits>
  warmup?: boolean
}

export async function createAccount(input: NewAccountInput): Promise<Account> {
  const [row] = await db
    .insert(accounts)
    .values({
      unipileAccountId: input.unipileAccountId,
      name: input.name,
      timezone: input.timezone ?? 'UTC',
      limits: { ...defaultLimits, ...input.limits },
      warmupStartedAt: input.warmup ? new Date() : null,
    })
    .returning()
  if (!row) throw new Error('Failed to create account')
  return row
}

export function findAccountByUnipileId(unipileAccountId: string) {
  return db.query.accounts.findFirst({ where: eq(accounts.unipileAccountId, unipileAccountId) })
}

export function listAccounts() {
  return db.select().from(accounts).orderBy(accounts.createdAt)
}

export async function listRunnableAccounts(now: Date): Promise<Account[]> {
  await db
    .update(accounts)
    .set({ status: 'active', pausedUntil: null, pauseReason: null })
    .where(
      and(
        eq(accounts.status, 'paused'),
        isNotNull(accounts.pausedUntil),
        lte(accounts.pausedUntil, now),
      ),
    )
  return db.select().from(accounts).where(eq(accounts.status, 'active'))
}

export async function getUsage(accountId: string, now: Date): Promise<Usage> {
  const day = new Date(now.getTime() - 86_400_000)
  const week = new Date(now.getTime() - 7 * 86_400_000)
  const rows = await db
    .select({
      type: actions.type,
      day: count(sql`case when ${gte(actions.createdAt, day)} then 1 end`),
      week: count(),
    })
    .from(actions)
    .where(
      and(eq(actions.accountId, accountId), eq(actions.status, 'ok'), gte(actions.createdAt, week)),
    )
    .groupBy(actions.type)
  const of = (type: string) => rows.find((r) => r.type === type)
  return {
    visitsDay: of('visit')?.day ?? 0,
    invitesDay: of('invite')?.day ?? 0,
    invitesWeek: of('invite')?.week ?? 0,
    messagesDay: of('message')?.day ?? 0,
  }
}

export async function setNextActionAt(accountId: string, at: Date) {
  await db.update(accounts).set({ nextActionAt: at }).where(eq(accounts.id, accountId))
}

export async function pauseAccount(accountId: string, reason: string, until: Date | null) {
  await db
    .update(accounts)
    .set({ status: 'paused', pauseReason: reason, pausedUntil: until })
    .where(eq(accounts.id, accountId))
}

export async function setAccountConnection(unipileAccountId: string, connected: boolean) {
  await db
    .update(accounts)
    .set(
      connected
        ? { status: 'active', pauseReason: null, pausedUntil: null }
        : { status: 'disconnected', pauseReason: 'unipile account disconnected' },
    )
    .where(eq(accounts.unipileAccountId, unipileAccountId))
}
