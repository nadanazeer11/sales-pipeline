import {
  type Account,
  listRunnableAccounts,
  logger,
  runAccountTurn,
  syncInvitations,
} from '@sp/core'

type Options = { tickMs: number; pollMs: number }

export function startScheduler({ tickMs, pollMs }: Options) {
  const tick = guarded('tick', async () => {
    const accounts = await listRunnableAccounts(new Date())
    await Promise.all(accounts.map(turn))
  })
  const poll = guarded('poll', async () => {
    const accounts = await listRunnableAccounts(new Date())
    for (const account of accounts) await syncInvitations(account)
  })

  const timers = [setInterval(tick, tickMs), setInterval(poll, pollMs)]
  void tick()
  void poll()
  return () => timers.forEach(clearInterval)
}

async function turn(account: Account) {
  const result = await runAccountTurn(account)
  if (result.status === 'done' || result.status === 'error') {
    logger.info({ account: account.name, ...result }, 'turn')
  }
}

function guarded(name: string, fn: () => Promise<void>) {
  let running = false
  return async () => {
    if (running) return
    running = true
    try {
      await fn()
    } catch (error) {
      logger.error({ err: error }, `${name} failed`)
    } finally {
      running = false
    }
  }
}
