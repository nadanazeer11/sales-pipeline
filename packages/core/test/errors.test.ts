import { describe, expect, it } from 'vitest'
import { UnipileError } from '../src/unipile/client'

const err = (status: number, type: string) => new UnipileError(status, type, { status, type })

describe('UnipileError', () => {
  it('treats rate limits as limits', () => {
    expect(err(429, 'api/too_many_requests').isLimit).toBe(true)
    expect(err(429, 'provider/too_many_requests').isLimit).toBe(true)
    expect(err(409, 'provider/conflict').isLimit).toBe(false)
  })

  it('treats 401 and 403 as disconnected', () => {
    expect(err(401, 'provider/invalid_authorization').isDisconnected).toBe(true)
    expect(err(403, 'api/account_restricted').isDisconnected).toBe(true)
  })

  it('treats 409 and 422 as rejections of the request itself', () => {
    expect(err(409, 'provider/conflict').isRejected).toBe(true)
    expect(err(422, 'provider/unprocessable_entity').isRejected).toBe(true)
    expect(err(500, 'provider/unexpected_error').isRejected).toBe(false)
  })
})
