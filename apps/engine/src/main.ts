import { serve } from '@hono/node-server'
import { closeDb, env, logger } from '@sp/core'
import { startScheduler } from './scheduler'
import { createServer } from './server'

const config = env()
const server = serve({ fetch: createServer().fetch, port: config.PORT }, ({ port }) =>
  logger.info({ port }, 'engine listening'),
)
const stopScheduler = startScheduler({
  tickMs: config.TICK_INTERVAL_MS,
  pollMs: config.POLL_INTERVAL_MS,
})

async function shutdown() {
  logger.info('shutting down')
  stopScheduler()
  server.close()
  await closeDb()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
