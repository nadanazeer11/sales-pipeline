import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, actions, type Campaign, campaigns, type Lead, leads } from '../db/schema'
import { messageCount, type Step, stepsSchema } from './steps'

export type StateCounts = Partial<Record<Lead['state'], number>>

export type CampaignSummary = {
  id: string
  name: string
  status: Campaign['status']
  accountName: string
  createdAt: Date
  messages: number
  leads: number
  states: StateCounts
  messaged: number
  replied: number
}

export type Funnel = {
  leads: number
  visited: number
  invited: number
  accepted: number
  messaged: number
  replied: number
}

export type CampaignDetail = {
  campaign: Campaign
  accountName: string
  states: StateCounts
  funnel: Funnel
}

async function stateCounts(campaignId?: string) {
  const rows = await db
    .select({ campaignId: leads.campaignId, state: leads.state, n: count() })
    .from(leads)
    .where(campaignId ? eq(leads.campaignId, campaignId) : undefined)
    .groupBy(leads.campaignId, leads.state)
  const byCampaign = new Map<string, StateCounts>()
  for (const row of rows) {
    const states = byCampaign.get(row.campaignId) ?? {}
    states[row.state] = row.n
    byCampaign.set(row.campaignId, states)
  }
  return byCampaign
}

async function reachedCounts(type: 'visit' | 'message', campaignId?: string) {
  const rows = await db
    .select({
      campaignId: leads.campaignId,
      n: sql<number>`count(distinct ${actions.leadId})::int`,
    })
    .from(actions)
    .innerJoin(leads, eq(leads.id, actions.leadId))
    .where(
      and(
        eq(actions.type, type),
        eq(actions.status, 'ok'),
        campaignId ? eq(leads.campaignId, campaignId) : undefined,
      ),
    )
    .groupBy(leads.campaignId)
  return new Map(rows.map((r) => [r.campaignId, r.n]))
}

const total = (states: StateCounts) => Object.values(states).reduce((a, b) => a + (b ?? 0), 0)

export async function campaignSummaries(): Promise<CampaignSummary[]> {
  const [rows, states, messaged] = await Promise.all([
    db
      .select({ campaign: campaigns, accountName: accounts.name })
      .from(campaigns)
      .innerJoin(accounts, eq(accounts.id, campaigns.accountId))
      .where(sql`${campaigns.status} <> 'archived'`)
      .orderBy(desc(campaigns.createdAt)),
    stateCounts(),
    reachedCounts('message'),
  ])
  return rows.map(({ campaign, accountName }) => {
    const counts = states.get(campaign.id) ?? {}
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      accountName,
      createdAt: campaign.createdAt,
      messages: messageCount(campaign.steps),
      leads: total(counts),
      states: counts,
      messaged: messaged.get(campaign.id) ?? 0,
      replied: counts.replied ?? 0,
    }
  })
}

export async function campaignDetail(id: string): Promise<CampaignDetail | undefined> {
  const [row] = await db
    .select({ campaign: campaigns, accountName: accounts.name })
    .from(campaigns)
    .innerJoin(accounts, eq(accounts.id, campaigns.accountId))
    .where(eq(campaigns.id, id))
  if (!row) return undefined

  const [states, visited, messaged, invited, accepted] = await Promise.all([
    stateCounts(id),
    reachedCounts('visit', id),
    reachedCounts('message', id),
    db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.campaignId, id), isNotNull(leads.invitedAt))),
    db
      .select({ n: count() })
      .from(leads)
      .where(and(eq(leads.campaignId, id), isNotNull(leads.connectedAt))),
  ])
  const counts = states.get(id) ?? {}
  return {
    campaign: row.campaign,
    accountName: row.accountName,
    states: counts,
    funnel: {
      leads: total(counts),
      visited: visited.get(id) ?? 0,
      invited: invited[0]?.n ?? 0,
      accepted: accepted[0]?.n ?? 0,
      messaged: messaged.get(id) ?? 0,
      replied: counts.replied ?? 0,
    },
  }
}

export async function updateDraftSteps(id: string, steps: unknown): Promise<Step[]> {
  const parsed = stepsSchema.parse(steps)
  const [row] = await db
    .update(campaigns)
    .set({ steps: parsed })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, 'draft')))
    .returning({ id: campaigns.id })
  if (!row) throw new Error('Only draft campaigns can change their sequence')
  return parsed
}
