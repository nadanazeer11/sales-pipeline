import { z } from 'zod'

const str = z.string().nullish()

export const profileSchema = z.looseObject({
  id: z.string(),
  public_identifier: str,
  display_name: str,
  first_name: str,
  last_name: str,
  specifics: z
    .looseObject({
      network_distance: str,
      notify_visit_token: str,
      relation_request_status: str,
      relation_request: z.looseObject({ id: z.string() }).nullish(),
    })
    .nullish(),
})

export const relationRequestSchema = z.looseObject({ id: z.string() })

export const relationListSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      id: z.string(),
      user: z.looseObject({ id: z.string(), public_identifier: str }),
    }),
  ),
  next_cursor: str,
})

export const chatStartedSchema = z.looseObject({ chat_id: z.string() })

export const messageListSchema = z.looseObject({
  data: z.array(
    z.looseObject({
      id: z.string(),
      text: str,
      is_sender: z.boolean().optional(),
      timestamp: z.string(),
    }),
  ),
})

export const userChatSchema = z.looseObject({
  data: z.array(z.looseObject({ chat_id: z.string(), inbox_id: str })),
})

export const accountListSchema = z.looseObject({
  data: z.array(z.looseObject({ id: z.string(), name: str, provider: z.string(), status: str })),
})

export const webhookEndpointSchema = z.looseObject({ id: z.string(), secret: z.string() })

export type Profile = z.infer<typeof profileSchema>

const envelopeSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  account_id: str,
  payload: z.unknown(),
})

const relationPayload = z.looseObject({
  user: z.looseObject({ id: z.string(), public_identifier: str }),
})

const messagePayload = z.looseObject({
  id: z.string(),
  chat_id: z.string(),
  sender_id: str,
  is_sender: z.boolean().optional(),
})

export const WEBHOOK_EVENTS = [
  'relation.new',
  'message.new',
  'account.status.running',
  'account.status.disconnected',
  'account.status.errored',
] as const

export type WebhookEvent = { key: string; type: string; accountId: string | null } & (
  | { kind: 'relation'; userId: string; publicIdentifier: string | null }
  | { kind: 'message'; chatId: string; senderId: string | null; isSender: boolean }
  | { kind: 'account_status'; connected: boolean }
  | { kind: 'unknown' }
)

export function parseWebhook(body: unknown): WebhookEvent | null {
  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) return null
  const { id, type, account_id, payload } = envelope.data
  const base = { key: id, type, accountId: account_id ?? null }

  if (type === 'relation.new') {
    const p = relationPayload.safeParse(payload)
    if (p.success) {
      return {
        ...base,
        kind: 'relation',
        userId: p.data.user.id,
        publicIdentifier: p.data.user.public_identifier?.toLowerCase() ?? null,
      }
    }
  }
  if (type === 'message.new') {
    const p = messagePayload.safeParse(payload)
    if (p.success) {
      return {
        ...base,
        kind: 'message',
        chatId: p.data.chat_id,
        senderId: p.data.sender_id ?? null,
        isSender: p.data.is_sender ?? false,
      }
    }
  }
  if (type.startsWith('account.status.')) {
    return { ...base, kind: 'account_status', connected: type === 'account.status.running' }
  }
  return { ...base, kind: 'unknown' }
}
