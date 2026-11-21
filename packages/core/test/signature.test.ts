import { describe, expect, it } from 'vitest'
import { signPayload, verifySignature } from '../src/webhooks/signature'

const secret = 'whsec_test'
const body = '{"id":"evt_1","type":"message.new"}'
const now = 1_795_000_000

describe('verifySignature', () => {
  it('accepts a valid signature', () => {
    expect(verifySignature(body, signPayload(body, secret, now), secret, now)).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(verifySignature(`${body} `, signPayload(body, secret, now), secret, now)).toBe(false)
  })

  it('rejects a wrong secret', () => {
    expect(verifySignature(body, signPayload(body, 'other', now), secret, now)).toBe(false)
  })

  it('rejects stale timestamps and missing headers', () => {
    expect(verifySignature(body, signPayload(body, secret, now - 600), secret, now)).toBe(false)
    expect(verifySignature(body, undefined, secret, now)).toBe(false)
    expect(verifySignature(body, 't=abc,v0=zz', secret, now)).toBe(false)
  })
})
