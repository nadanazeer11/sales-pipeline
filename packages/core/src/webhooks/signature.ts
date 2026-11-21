import { createHmac, timingSafeEqual } from 'node:crypto'

const TOLERANCE_SECONDS = 300

export function verifySignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...rest] = part.trim().split('=')
      return [key, rest.join('=')]
    }),
  )
  const timestamp = Number(parts.t)
  const signature = parts.v0
  if (!Number.isFinite(timestamp) || !signature) return false
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const a = Buffer.from(signature, 'hex')
  const b = Buffer.from(expected, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function signPayload(rawBody: string, secret: string, timestamp: number): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  return `t=${timestamp},v0=${digest}`
}
