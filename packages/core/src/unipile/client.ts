import { z } from 'zod'
import { env } from '../env'
import type { ChatMessage } from '../sequence/chat'
import {
  accountListSchema,
  chatStartedSchema,
  messageListSchema,
  type Profile,
  profileSchema,
  relationListSchema,
  relationRequestSchema,
  userChatSchema,
  WEBHOOK_EVENTS,
  webhookEndpointSchema,
} from './payloads'

const relaxed = z.unknown()

const PRIMARY_INBOX = 'CLASSIC_PRIMARY'

const REQUEST_TIMEOUT_MS = 45_000

const LIMIT_TYPES = new Set(['api/too_many_requests', 'provider/too_many_requests'])

export class UnipileError extends Error {
  constructor(
    readonly status: number,
    readonly type: string | undefined,
    readonly body: unknown,
  ) {
    super(`Unipile ${status}${type ? ` ${type}` : ''}`)
  }

  get isLimit() {
    return this.status === 429 || LIMIT_TYPES.has(this.type ?? '')
  }

  get isDisconnected() {
    return this.status === 401 || this.status === 403
  }

  get isNotImplemented() {
    return this.status === 501
  }

  get isRejected() {
    return this.status === 409 || this.status === 422
  }
}

type Query = Record<string, string | number | boolean | undefined>
type RequestInit = { method?: 'GET' | 'POST'; query?: Query; json?: unknown; service?: boolean }

async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init: RequestInit = {},
): Promise<z.infer<T>> {
  const { UNIPILE_BASE_URL, UNIPILE_API_KEY, UNIPILE_SERVICE_KEY } = env()
  const apiKey = init.service ? UNIPILE_SERVICE_KEY : UNIPILE_API_KEY
  if (!apiKey) throw new Error('UNIPILE_SERVICE_KEY is required for this operation')
  const url = new URL(`${UNIPILE_BASE_URL.replace(/\/$/, '')}/v2${path}`)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const headers: Record<string, string> = {
    'X-API-KEY': apiKey,
    accept: 'application/json',
  }
  if (init.json !== undefined) headers['content-type'] = 'application/json'

  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers,
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const type = (body as { type?: string } | null)?.type
    throw new UnipileError(res.status, type, body)
  }
  return schema.parse(body)
}

const at = (accountId: string, path: string) => `/${encodeURIComponent(accountId)}${path}`
const seg = encodeURIComponent

export const unipile = {
  listAccounts: () => request('/accounts/', accountListSchema, { query: { limit: 100 } }),

  getProfile: (accountId: string, userId: string): Promise<Profile> =>
    request(at(accountId, `/users/${seg(userId)}`), profileSchema, {
      query: { variant: 'linkedin_classic' },
    }),

  reportVisit: (accountId: string, token: string) =>
    request(at(accountId, '/users/visit-profile'), relaxed, {
      method: 'POST',
      query: { token },
    }),

  sendRelationRequest: (accountId: string, userId: string, message?: string) =>
    request(at(accountId, '/users/me/relation-requests'), relationRequestSchema, {
      method: 'POST',
      json: { user_id: userId, message },
    }),

  cancelRelationRequest: (accountId: string, requestId: string) =>
    request(at(accountId, `/users/me/relation-requests/${seg(requestId)}/cancel`), relaxed, {
      method: 'POST',
    }),

  listRelations: (accountId: string, cursor?: string) =>
    request(at(accountId, '/users/me/relations'), relationListSchema, {
      query: { limit: 100, cursor },
    }),

  findUserChat: async (accountId: string, userId: string): Promise<string | null> => {
    try {
      const res = await request(at(accountId, `/users/${seg(userId)}/chat`), userChatSchema)
      return res.data[0]?.chat_id ?? null
    } catch (error) {
      if (error instanceof UnipileError && (error.isNotImplemented || error.status === 404)) {
        return null
      }
      throw error
    }
  },

  startChat: async (accountId: string, userId: string, text: string) => {
    const json = { users_ids: userId, text }
    try {
      return await request(
        at(accountId, `/inboxes/${PRIMARY_INBOX}/chats/send`),
        chatStartedSchema,
        { method: 'POST', json },
      )
    } catch (error) {
      if (!(error instanceof UnipileError && error.isNotImplemented)) throw error
      return request(at(accountId, '/chats/send'), chatStartedSchema, { method: 'POST', json })
    }
  },

  recentMessages: async (accountId: string, chatId: string): Promise<ChatMessage[]> => {
    const res = await request(at(accountId, `/chats/${seg(chatId)}/messages`), messageListSchema, {
      query: { limit: 20 },
    })
    return res.data.map((m) => ({
      text: m.text ?? null,
      isSender: m.is_sender ?? false,
      at: new Date(m.timestamp),
    }))
  },

  sendMessage: (accountId: string, chatId: string, text: string) =>
    request(at(accountId, `/chats/${seg(chatId)}/messages/send`), relaxed, {
      method: 'POST',
      json: { text },
    }),

  createWebhookEndpoint: (url: string, accountIds?: string[]) =>
    request('/webhooks/endpoints/', webhookEndpointSchema, {
      method: 'POST',
      service: true,
      json: {
        url,
        trigger_events: WEBHOOK_EVENTS,
        account_ids: accountIds,
        description: 'sales-pipeline engine',
      },
    }),
}
