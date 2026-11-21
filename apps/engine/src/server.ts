import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { env, handleWebhook, logger, verifySignature } from '@sp/core'
import { Hono } from 'hono'

const CAPTURE_DIR = join(import.meta.dirname, '../../../packages/core/test/fixtures/captured')

export function createServer() {
  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true }))

  app.post('/webhooks/unipile', async (c) => {
    const secret = env().UNIPILE_WEBHOOK_SECRET
    if (!secret) return c.json({ error: 'webhook secret not configured' }, 503)

    const raw = await c.req.text()
    if (!verifySignature(raw, c.req.header('unipile-signature'), secret)) {
      return c.json({ error: 'invalid signature' }, 401)
    }
    const body: unknown = JSON.parse(raw)
    const result = await handleWebhook(body)
    if (env().CAPTURE_WEBHOOKS) await capture(result.kind, body)
    logger.info(result, 'webhook')
    return c.json({ ok: true })
  })

  return app
}

async function capture(kind: string, body: unknown) {
  await mkdir(CAPTURE_DIR, { recursive: true })
  await writeFile(join(CAPTURE_DIR, `${kind}-${Date.now()}.json`), JSON.stringify(body, null, 2))
}
