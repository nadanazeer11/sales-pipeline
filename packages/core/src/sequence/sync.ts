import type { Account } from '../db/schema'
import { listAwaitingAccept, markConnected } from '../leads/leads'
import { logger } from '../logger'
import { unipile } from '../unipile/client'

const MIN_AGE_MS = 30 * 60_000
const MAX_PAGES = 3

export async function syncInvitations(account: Account, now = new Date()) {
  const awaiting = await listAwaitingAccept(account.id, new Date(now.getTime() - MIN_AGE_MS))
  if (awaiting.length === 0) return { connected: 0 }

  const relations = new Set<string>()
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await unipile.listRelations(account.unipileAccountId, cursor)
    for (const { user } of res.data) {
      relations.add(user.id)
      if (user.public_identifier) relations.add(user.public_identifier.toLowerCase())
    }
    cursor = res.next_cursor ?? undefined
    if (!cursor) break
  }

  let connected = 0
  for (const lead of awaiting) {
    if (relations.has(lead.publicIdentifier) || (lead.userId && relations.has(lead.userId))) {
      await markConnected(lead, now)
      connected++
    }
  }
  logger.info({ accountId: account.id, connected }, 'invitation sync')
  return { connected }
}
