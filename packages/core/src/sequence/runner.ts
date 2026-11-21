import { getUsage, pauseAccount, setAccountConnection, setNextActionAt } from '../accounts/accounts'
import { isWorkingTime, randomGapMs, remaining, warmupFactor } from '../accounts/quota'
import { advance, campaignTexts, render, type StepType } from '../campaigns/steps'
import { db } from '../db/client'
import { type Account, type ActionType, actions } from '../db/schema'
import { claimDueLead, type DueLead, type LeadPatch, updateLead } from '../leads/leads'
import { logger } from '../logger'
import { UnipileError, unipile } from '../unipile/client'
import type { Profile } from '../unipile/payloads'
import { inspectChat } from './chat'

const LIMIT_PAUSE_MS = 3 * 86_400_000
const RETRY_DELAY_MS = 60 * 60_000
const MAX_ATTEMPTS = 2

export type TurnResult =
  | { status: 'waiting' | 'off_hours' | 'idle' }
  | { status: 'done'; leadId: string; action: ActionType | 'complete' }
  | { status: 'error'; leadId: string; error: string }

type Outcome = {
  action: ActionType | 'complete'
  patch: LeadPatch
  response?: unknown
  visited?: boolean
}

export async function runAccountTurn(account: Account, now = new Date()): Promise<TurnResult> {
  if (account.nextActionAt && account.nextActionAt > now) return { status: 'waiting' }
  if (!isWorkingTime(account, now)) return { status: 'off_hours' }

  const quota = remaining(
    account.limits,
    await getUsage(account.id, now),
    warmupFactor(account.warmupStartedAt, now),
  )
  const allowed = (['visit', 'invite', 'message'] as const).filter((t) => quota[t] > 0)
  const lead = await claimDueLead(account.id, allowed, now)
  if (!lead) return { status: 'idle' }

  try {
    const outcome = await execute(account, lead, now)
    const applied = await updateLead(lead.id, outcome.patch, lead.state)
    if (!applied) logger.info({ leadId: lead.id }, 'lead changed during turn, kept newer state')
    if (outcome.visited) await recordAction(account.id, lead.id, 'lookup', 'ok')
    if (outcome.action !== 'complete') {
      await recordAction(account.id, lead.id, outcome.action, 'ok', outcome.response)
      await setNextActionAt(
        account.id,
        new Date(now.getTime() + randomGapMs(account.minGapMinutes, account.maxGapMinutes)),
      )
    }
    return { status: 'done', leadId: lead.id, action: outcome.action }
  } catch (error) {
    await handleFailure(account, lead, error, now)
    return { status: 'error', leadId: lead.id, error: describe(error) }
  }
}

async function execute(account: Account, lead: DueLead, now: Date): Promise<Outcome> {
  const accountId = account.unipileAccountId

  if (lead.state === 'awaiting_accept') return withdraw(accountId, lead)

  const step = lead.steps[lead.stepIndex]
  if (!step) return { action: 'complete', patch: { state: 'completed' } }

  const needsProfile = step.type !== 'message' || !lead.userId
  const profile = needsProfile
    ? await unipile.getProfile(accountId, lead.userId ?? lead.publicIdentifier)
    : undefined
  const identity = profile ? identityFrom(profile, lead, now) : {}
  const current = { ...lead, ...identity }
  const userId = current.userId ?? ''
  const visited = Boolean(profile)
  const vars = {
    ...lead.data,
    firstName: current.firstName,
    lastName: current.lastName,
    company: current.company,
  }
  const next = { ...identity, ...advance(lead.steps, lead.stepIndex, now) }

  if (step.type === 'visit') {
    const token = profile?.specifics?.notify_visit_token
    if (token) await unipile.reportVisit(accountId, token)
    return { action: 'visit', response: profile, patch: next }
  }

  if (step.type === 'invite') {
    if (current.connectedAt) return { action: 'complete', visited, patch: next }
    const awaiting: LeadPatch = {
      ...identity,
      state: 'awaiting_accept',
      invitedAt: current.invitedAt ?? now,
      nextActionAt: new Date(now.getTime() + step.timeoutDays * 86_400_000),
      attempts: 0,
      lastError: null,
    }
    if (current.relationRequestId) return { action: 'complete', visited, patch: awaiting }

    const note = step.note ? render(step.note, vars) : undefined
    try {
      const sent = await unipile.sendRelationRequest(accountId, userId, note)
      return {
        action: 'invite',
        visited,
        response: sent,
        patch: { ...awaiting, relationRequestId: sent.id },
      }
    } catch (error) {
      if (!(error instanceof UnipileError) || !error.isRejected) throw error
      return {
        action: 'complete',
        visited,
        response: error.body,
        patch: { ...identity, state: 'failed', lastError: describe(error) },
      }
    }
  }

  const text = render(step.template, vars)
  let chatId = lead.chatId ?? (await unipile.findUserChat(accountId, userId))

  if (chatId) {
    const verdict = inspectChat(await unipile.recentMessages(accountId, chatId), {
      since: lead.createdAt,
      text,
      campaignTexts: campaignTexts(lead.steps, vars),
    })
    if (verdict.kind === 'replied') {
      return {
        action: 'complete',
        visited,
        patch: { ...identity, state: 'replied', repliedAt: verdict.at, chatId },
      }
    }
    if (verdict.kind === 'manual') {
      return {
        action: 'complete',
        visited,
        patch: { ...identity, state: 'stopped', chatId, lastError: 'you messaged them manually' },
      }
    }
    if (verdict.kind === 'already_sent') {
      return {
        action: 'message',
        visited,
        response: { chatId, text, reconciled: true },
        patch: { ...next, chatId },
      }
    }
    await unipile.sendMessage(accountId, chatId, text)
  } else {
    chatId = (await unipile.startChat(accountId, userId, text)).chat_id
  }
  return { action: 'message', visited, response: { chatId, text }, patch: { ...next, chatId } }
}

async function withdraw(accountId: string, lead: DueLead): Promise<Outcome> {
  const patch: LeadPatch = { state: 'expired', relationRequestId: null }
  if (!lead.relationRequestId) return { action: 'complete', patch }
  try {
    await unipile.cancelRelationRequest(accountId, lead.relationRequestId)
  } catch (error) {
    const gone = error instanceof UnipileError && (error.status === 404 || error.isRejected)
    if (!gone) throw error
  }
  return { action: 'withdraw', patch }
}

export function identityFrom(
  profile: Profile,
  lead: Pick<DueLead, 'firstName' | 'lastName' | 'connectedAt' | 'relationRequestId'>,
  now: Date,
): LeadPatch {
  const specifics = profile.specifics
  const pendingRequest =
    specifics?.relation_request_status === 'PENDING' ? specifics.relation_request?.id : undefined
  return {
    userId: profile.id,
    firstName: lead.firstName ?? profile.first_name ?? null,
    lastName: lead.lastName ?? profile.last_name ?? null,
    ...(specifics?.network_distance === 'FIRST_DEGREE' && !lead.connectedAt
      ? { connectedAt: now }
      : {}),
    ...(pendingRequest && !lead.relationRequestId ? { relationRequestId: pendingRequest } : {}),
  }
}

async function handleFailure(account: Account, lead: DueLead, error: unknown, now: Date) {
  const message = describe(error)
  logger.warn({ accountId: account.id, leadId: lead.id, error: message }, 'step failed')
  await recordAction(
    account.id,
    lead.id,
    actionTypeFor(lead),
    'error',
    error instanceof UnipileError ? error.body : undefined,
    message,
  )

  if (error instanceof UnipileError && error.isLimit) {
    await pauseAccount(
      account.id,
      `limit reached: ${message}`,
      new Date(now.getTime() + LIMIT_PAUSE_MS),
    )
    await updateLead(
      lead.id,
      { nextActionAt: new Date(now.getTime() + LIMIT_PAUSE_MS) },
      lead.state,
    )
    return
  }
  if (error instanceof UnipileError && error.isDisconnected) {
    await setAccountConnection(account.unipileAccountId, false)
    await updateLead(lead.id, { nextActionAt: now }, lead.state)
    return
  }
  const attempts = lead.attempts + 1
  await updateLead(
    lead.id,
    {
      attempts,
      lastError: message,
      ...(attempts >= MAX_ATTEMPTS
        ? { state: 'failed' }
        : { nextActionAt: new Date(now.getTime() + RETRY_DELAY_MS) }),
    },
    lead.state,
  )
}

function actionTypeFor(lead: DueLead): ActionType {
  if (lead.state === 'awaiting_accept') return 'withdraw'
  const type: StepType | undefined = lead.steps[lead.stepIndex]?.type
  return type ?? 'visit'
}

async function recordAction(
  accountId: string,
  leadId: string,
  type: ActionType,
  status: 'ok' | 'error',
  response?: unknown,
  error?: string,
) {
  await db.insert(actions).values({ accountId, leadId, type, status, response, error })
}

function describe(error: unknown): string {
  if (error instanceof UnipileError)
    return `${error.message} ${JSON.stringify(error.body)}`.slice(0, 500)
  return error instanceof Error ? error.message : String(error)
}
