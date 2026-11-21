import { eq } from 'drizzle-orm'
import { findAccountByUnipileId, setAccountConnection } from '../accounts/accounts'
import { db } from '../db/client'
import { webhookEvents } from '../db/schema'
import { findLeadByProfile, markConnected, markRepliedByUser } from '../leads/leads'
import { logger } from '../logger'
import { parseWebhook, type WebhookEvent } from '../unipile/payloads'

export async function handleWebhook(body: unknown, now = new Date()) {
  const event = parseWebhook(body)
  if (!event) {
    logger.warn({ body }, 'malformed webhook')
    return { kind: 'malformed', duplicate: false }
  }

  const [stored] = await db
    .insert(webhookEvents)
    .values({ eventKey: event.key, type: event.type, payload: body ?? {} })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id })
  if (!stored) return { kind: event.kind, duplicate: true }

  try {
    await dispatch(event, now)
    await db.update(webhookEvents).set({ processedAt: now }).where(eq(webhookEvents.id, stored.id))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ type: event.type, error: message }, 'webhook handling failed')
    await db.update(webhookEvents).set({ error: message }).where(eq(webhookEvents.id, stored.id))
  }
  return { kind: event.kind, duplicate: false }
}

async function dispatch(event: WebhookEvent, now: Date) {
  if (event.kind === 'unknown' || !event.accountId) return
  if (event.kind === 'account_status') {
    await setAccountConnection(event.accountId, event.connected)
    return
  }

  const account = await findAccountByUnipileId(event.accountId)
  if (!account) return

  if (event.kind === 'relation') {
    const lead = await findLeadByProfile(
      account.id,
      { userId: event.userId, publicIdentifier: event.publicIdentifier },
      ['awaiting_accept'],
    )
    if (lead) await markConnected(lead, now)
    return
  }

  if (event.isSender || !event.senderId) return
  await markRepliedByUser(account.id, event.senderId, event.chatId, now)
}
