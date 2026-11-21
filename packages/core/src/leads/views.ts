import { and, asc, desc, eq, inArray, max, sql } from 'drizzle-orm'
import { stepLabel } from '../campaigns/steps'
import { db } from '../db/client'
import { type ActionType, actions, campaigns, type Lead, leads, webhookEvents } from '../db/schema'

export type LeadRow = {
  id: string
  name: string
  publicIdentifier: string
  linkedinUrl: string
  company: string | null
  state: Lead['state']
  step: string
  nextActionAt: Date
  lastActivityAt: Date | null
  repliedAt: Date | null
  lastError: string | null
}

export type TimelineItem =
  | { kind: Exclude<ActionType, 'lookup'>; at: Date; ok: boolean; text?: string; error?: string }
  | { kind: 'reply'; at: Date; text: string }
  | { kind: 'connected'; at: Date }

export type LeadDetail = LeadRow & {
  campaignId: string
  campaignName: string
  totalSteps: number
  stepIndex: number
  timeline: TimelineItem[]
}

export type InboxItem = {
  leadId: string
  name: string
  company: string | null
  campaignName: string
  repliedAt: Date
  text: string | null
}

const displayName = (lead: Pick<Lead, 'firstName' | 'lastName' | 'publicIdentifier'>) =>
  [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.publicIdentifier

export function stepDescription(
  lead: Pick<Lead, 'state' | 'stepIndex' | 'invitedAt' | 'connectedAt'>,
  steps: Parameters<typeof stepLabel>[0],
): string {
  const invitePending = lead.invitedAt !== null && lead.connectedAt === null
  const previous = invitePending
    ? stepLabel(steps, lead.stepIndex)
    : lead.stepIndex > 0
      ? stepLabel(steps, lead.stepIndex - 1)
      : null
  switch (lead.state) {
    case 'awaiting_accept':
      return 'Waiting for accept'
    case 'completed':
      return 'Sequence finished'
    case 'replied':
      return previous ? `Replied after ${previous.toLowerCase()}` : 'Replied'
    case 'stopped':
      return previous ? `Stopped after ${previous.toLowerCase()}` : 'Stopped'
    case 'expired':
      return 'Invite not accepted'
    case 'failed':
      return `Failed at ${stepLabel(steps, lead.stepIndex).toLowerCase()}`
    default:
      return `Next: ${stepLabel(steps, lead.stepIndex).toLowerCase()}`
  }
}

function toRow(lead: Lead, steps: Parameters<typeof stepLabel>[0], last: Date | null): LeadRow {
  return {
    id: lead.id,
    name: displayName(lead),
    publicIdentifier: lead.publicIdentifier,
    linkedinUrl: lead.linkedinUrl,
    company: lead.company,
    state: lead.state,
    step: stepDescription(lead, steps),
    nextActionAt: lead.nextActionAt,
    lastActivityAt: last,
    repliedAt: lead.repliedAt,
    lastError: lead.lastError,
  }
}

async function lastActivity(leadIds: string[]) {
  if (leadIds.length === 0) return new Map<string, Date>()
  const rows = await db
    .select({ leadId: actions.leadId, at: max(actions.createdAt) })
    .from(actions)
    .where(inArray(actions.leadId, leadIds))
    .groupBy(actions.leadId)
  return new Map(rows.flatMap((r) => (r.leadId && r.at ? [[r.leadId, r.at] as const] : [])))
}

async function inboundMessages(chatIds: string[]) {
  if (chatIds.length === 0) return []
  return db
    .select({
      chatId: sql<string>`${webhookEvents.payload}->'payload'->>'chat_id'`,
      text: sql<string | null>`${webhookEvents.payload}->'payload'->>'text'`,
      at: webhookEvents.createdAt,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.type, 'message.new'),
        sql`(${webhookEvents.payload}->'payload'->>'is_sender')::boolean is not true`,
        inArray(sql`${webhookEvents.payload}->'payload'->>'chat_id'`, chatIds),
      ),
    )
    .orderBy(desc(webhookEvents.createdAt))
}

export async function campaignLeads(campaignId: string): Promise<LeadRow[]> {
  const campaign = await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) })
  if (!campaign) return []
  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.campaignId, campaignId))
    .orderBy(asc(leads.createdAt))
  const activity = await lastActivity(rows.map((r) => r.id))
  return rows.map((lead) => toRow(lead, campaign.steps, activity.get(lead.id) ?? null))
}

export async function leadDetail(leadId: string): Promise<LeadDetail | undefined> {
  const [row] = await db
    .select({ lead: leads, campaign: campaigns })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(eq(leads.id, leadId))
  if (!row) return undefined
  const { lead, campaign } = row

  const [history, replies] = await Promise.all([
    db.select().from(actions).where(eq(actions.leadId, leadId)).orderBy(asc(actions.createdAt)),
    lead.chatId ? inboundMessages([lead.chatId]) : Promise.resolve([]),
  ])
  const timeline: TimelineItem[] = [
    ...history
      .flatMap((a) => (a.type === 'lookup' ? [] : [{ ...a, type: a.type }]))
      .map((a) => ({
        kind: a.type,
        at: a.createdAt,
        ok: a.status === 'ok',
        text: (a.response as { text?: string } | null)?.text,
        error: a.error ?? undefined,
      })),
    ...replies.map((r) => ({ kind: 'reply' as const, at: r.at, text: r.text ?? '' })),
    ...(lead.connectedAt ? [{ kind: 'connected' as const, at: lead.connectedAt }] : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime())

  const last = history.at(-1)?.createdAt ?? null
  return {
    ...toRow(lead, campaign.steps, last),
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalSteps: campaign.steps.length,
    stepIndex: lead.stepIndex,
    timeline,
  }
}

export async function inboxReplies(limit = 100): Promise<InboxItem[]> {
  const rows = await db
    .select({ lead: leads, campaignName: campaigns.name })
    .from(leads)
    .innerJoin(campaigns, eq(campaigns.id, leads.campaignId))
    .where(eq(leads.state, 'replied'))
    .orderBy(desc(leads.repliedAt))
    .limit(limit)
  const chatIds = rows.flatMap((r) => (r.lead.chatId ? [r.lead.chatId] : []))
  const latest = new Map<string, string | null>()
  for (const message of await inboundMessages(chatIds)) {
    if (!latest.has(message.chatId)) latest.set(message.chatId, message.text)
  }
  return rows.map(({ lead, campaignName }) => ({
    leadId: lead.id,
    name: displayName(lead),
    company: lead.company,
    campaignName,
    repliedAt: lead.repliedAt ?? lead.updatedAt,
    text: lead.chatId ? (latest.get(lead.chatId) ?? null) : null,
  }))
}

export async function stopLead(leadId: string) {
  const [row] = await db
    .update(leads)
    .set({ state: 'stopped', lastError: 'stopped from dashboard' })
    .where(and(eq(leads.id, leadId), inArray(leads.state, ['active', 'awaiting_accept'])))
    .returning({ id: leads.id })
  return Boolean(row)
}
