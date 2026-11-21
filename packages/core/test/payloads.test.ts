import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLeadsCsv, publicIdentifierFromUrl } from '../src/leads/import'
import { parseWebhook } from '../src/unipile/payloads'

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'))

describe('parseWebhook', () => {
  it('parses relation.new', () => {
    expect(parseWebhook(fixture('relation_new.sample.json'))).toMatchObject({
      kind: 'relation',
      key: 'evt_rel_1',
      accountId: 'acc_123',
      userId: 'ACoAAA1',
      publicIdentifier: 'jane-doe',
    })
  })

  it('parses message.new', () => {
    expect(parseWebhook(fixture('message_new.real-redacted.json'))).toMatchObject({
      kind: 'message',
      key: 'evt_msg_1',
      chatId: 'CLASSIC_2-chat_1',
      senderId: 'ACoAAA1',
      isSender: false,
    })
  })

  it('maps account status events to connected flags', () => {
    expect(parseWebhook(fixture('account_status.sample.json'))).toMatchObject({
      kind: 'account_status',
      connected: false,
    })
    expect(
      parseWebhook({ id: 'e', type: 'account.status.running', account_id: 'acc_1', payload: {} }),
    ).toMatchObject({ connected: true })
  })

  it('returns unknown for unhandled types and null for malformed bodies', () => {
    expect(parseWebhook({ id: 'e', type: 'email.new', payload: {} })?.kind).toBe('unknown')
    expect(parseWebhook({ foo: 1 })).toBeNull()
  })
})

describe('leads csv', () => {
  it('extracts public identifiers', () => {
    expect(publicIdentifierFromUrl('https://www.linkedin.com/in/Jane-Doe/?utm=x')).toBe('jane-doe')
    expect(publicIdentifierFromUrl('https://example.com')).toBeNull()
  })

  it('maps core columns and keeps extras in data', () => {
    const csv =
      'linkedin_url,first_name,topic\nhttps://linkedin.com/in/jane,Jane,pricing\nnot-a-url,X,y\n'
    const { rows, skipped } = parseLeadsCsv(csv, 'c1')
    expect(rows).toEqual([
      expect.objectContaining({
        publicIdentifier: 'jane',
        firstName: 'Jane',
        data: { topic: 'pricing' },
      }),
    ])
    expect(skipped).toEqual(['not-a-url'])
  })
})
