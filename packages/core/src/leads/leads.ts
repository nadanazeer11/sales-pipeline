import { and, eq, inArray, lte, or, sql } from 'drizzle-orm'
import { advance, type Step, type StepType } from '../campaigns/steps'
import { db } from '../db/client'
import { campaigns, type Lead, leads } from '../db/schema'

const LEASE_MS = 10 * 60_000

export type DueLead = Lead & { steps: Step[] }

export type LeadPatch = Partial<Omit<Lead, 'id' | 'campaignId' | 'createdAt' | 'updatedAt'>>

export async function claimDueLead(
  accountId: string,
  allowed: StepType[],
  now: Date,
): Promise<DueLead | undefined> {
  const currentType = sql`${campaigns.steps} -> ${leads.stepIndex} ->> 'type'`
  const due = db
    .select({ id: leads.id })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(
      and(
        eq(campaigns.accountId, accountId),
        eq(campaigns.status, 'active'),
        lte(leads.nextActionAt, now),
        or(
          eq(leads.state, 'awaiting_accept'),
          and(
            eq(leads.state, 'active'),
            or(
              sql`${leads.stepIndex} >= jsonb_array_length(${campaigns.steps})`,
              allowed.length > 0 ? inArray(currentType, allowed) : sql`false`,
            ),
          ),
        ),
      ),
    )
    .orderBy(leads.nextActionAt)
    .limit(1)
    .for('update', { of: leads, skipLocked: true })

  const [claimed] = await db
    .update(leads)
    .set({ nextActionAt: new Date(now.getTime() + LEASE_MS) })
    .where(inArray(leads.id, due))
    .returning()
  if (!claimed) return undefined

  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, claimed.campaignId),
    columns: { steps: true },
  })
  return { ...claimed, steps: campaign?.steps ?? [] }
}

export async function updateLead(id: string, patch: LeadPatch, expectedState?: Lead['state']) {
  const rows = await db
    .update(leads)
    .set(patch)
    .where(expectedState ? and(eq(leads.id, id), eq(leads.state, expectedState)) : eq(leads.id, id))
    .returning({ id: leads.id })
  return rows.length > 0
}

export async function markConnected(
  lead: Pick<Lead, 'id' | 'campaignId' | 'stepIndex'>,
  now: Date,
) {
  const campaign = await db.query.campaigns.findFirst({
    where: eq(campaigns.id, lead.campaignId),
    columns: { steps: true },
  })
  return updateLead(
    lead.id,
    { ...advance(campaign?.steps ?? [], lead.stepIndex, now), connectedAt: now },
    'awaiting_accept',
  )
}

const OPEN_STATES: Lead['state'][] = ['active', 'awaiting_accept', 'completed']

export async function markRepliedByUser(
  accountId: string,
  userId: string,
  chatId: string,
  now: Date,
) {
  const ids = db
    .select({ id: leads.id })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(
      and(
        eq(campaigns.accountId, accountId),
        eq(leads.userId, userId),
        inArray(leads.state, OPEN_STATES),
      ),
    )
  const rows = await db
    .update(leads)
    .set({ state: 'replied', repliedAt: now, chatId })
    .where(inArray(leads.id, ids))
    .returning({ id: leads.id })
  return rows.length
}

export async function stopLeadsByProfile(publicIdentifier: string, reason: string) {
  return db
    .update(leads)
    .set({ state: 'stopped', lastError: reason })
    .where(
      and(
        eq(leads.publicIdentifier, publicIdentifier),
        inArray(leads.state, ['active', 'awaiting_accept']),
      ),
    )
    .returning({ id: leads.id, campaignId: leads.campaignId })
}

export async function findLeadByProfile(
  accountId: string,
  ref: { userId: string; publicIdentifier?: string | null },
  states: Lead['state'][],
): Promise<Lead | undefined> {
  const match = ref.publicIdentifier
    ? or(eq(leads.userId, ref.userId), eq(leads.publicIdentifier, ref.publicIdentifier))
    : eq(leads.userId, ref.userId)
  const [row] = await db
    .select({ lead: leads })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(and(eq(campaigns.accountId, accountId), inArray(leads.state, states), match))
    .orderBy(leads.createdAt)
    .limit(1)
  return row?.lead
}

export async function listAwaitingAccept(accountId: string, invitedBefore: Date): Promise<Lead[]> {
  const rows = await db
    .select({ lead: leads })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(
      and(
        eq(campaigns.accountId, accountId),
        eq(leads.state, 'awaiting_accept'),
        lte(leads.invitedAt, invitedBefore),
      ),
    )
  return rows.map((r) => r.lead)
}

export async function leadStats(campaignId: string) {
  return db
    .select({ state: leads.state, count: sql<number>`count(*)::int` })
    .from(leads)
    .where(eq(leads.campaignId, campaignId))
    .groupBy(leads.state)
}
