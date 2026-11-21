import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import {
  closeDb,
  createAccount,
  createCampaign,
  findAccountByUnipileId,
  importLeads,
  leadStats,
  listAccounts,
  listCampaigns,
  listRunnableAccounts,
  parseLeadsCsv,
  publicIdentifierFromUrl,
  runAccountTurn,
  setCampaignStatus,
  stopLeadsByProfile,
  syncInvitations,
  unipile,
} from '@sp/core'

type Command = { usage: string; run: (args: string[], flags: Flags) => Promise<unknown> }
type Flags = Record<string, string | boolean | undefined>

const commands: Record<string, Command> = {
  'unipile:accounts': {
    usage: '',
    run: async () =>
      (await unipile.listAccounts()).data.map(({ id, name, status }) => ({ id, name, status })),
  },

  'account:add': {
    usage: '<unipileAccountId> <name> [--tz Africa/Cairo] [--warmup]',
    run: ([unipileAccountId, name], flags) =>
      createAccount({
        unipileAccountId: required(unipileAccountId, 'unipileAccountId'),
        name: required(name, 'name'),
        timezone: typeof flags.tz === 'string' ? flags.tz : undefined,
        warmup: flags.warmup === true,
      }),
  },

  accounts: { usage: '', run: () => listAccounts() },

  'campaign:create': {
    usage: '<file.json>',
    run: async ([file]) => {
      const spec = JSON.parse(await readFile(required(file, 'file'), 'utf8'))
      const account = await findAccountByUnipileId(spec.unipileAccountId)
      if (!account) throw new Error(`No account with unipileAccountId ${spec.unipileAccountId}`)
      return createCampaign({ accountId: account.id, name: spec.name, steps: spec.steps })
    },
  },

  'campaign:start': {
    usage: '<campaignId>',
    run: ([id]) => setCampaignStatus(required(id, 'id'), 'active'),
  },
  'campaign:pause': {
    usage: '<campaignId>',
    run: ([id]) => setCampaignStatus(required(id, 'id'), 'paused'),
  },

  campaigns: {
    usage: '',
    run: async () =>
      Promise.all(
        (await listCampaigns()).map(async (c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          leads: Object.fromEntries((await leadStats(c.id)).map((s) => [s.state, s.count])),
        })),
      ),
  },

  'leads:import': {
    usage: '<campaignId> <file.csv>',
    run: async ([campaignId, file]) => {
      const csv = await readFile(required(file, 'file'), 'utf8')
      const { rows, skipped } = parseLeadsCsv(csv, required(campaignId, 'campaignId'))
      const imported = await importLeads(rows)
      return { imported, duplicates: rows.length - imported, skipped }
    },
  },

  'lead:stop': {
    usage: '<linkedinUrl>',
    run: async ([url]) => {
      const identifier = publicIdentifierFromUrl(required(url, 'linkedinUrl'))
      if (!identifier) throw new Error('Not a linkedin.com/in/ URL')
      const stopped = await stopLeadsByProfile(identifier, 'stopped manually')
      return { stopped: stopped.length }
    },
  },

  'webhooks:register': {
    usage: '<publicBaseUrl>',
    run: async ([baseUrl]) => {
      const url = `${required(baseUrl, 'publicBaseUrl').replace(/\/$/, '')}/webhooks/unipile`
      const endpoint = await unipile.createWebhookEndpoint(url)
      return { id: endpoint.id, next: `set UNIPILE_WEBHOOK_SECRET=${endpoint.secret} in .env` }
    },
  },

  probe: {
    usage: '<unipileAccountId> <linkedinUrl> [--visit] [--invite "note"] [--message "text"]',
    run: async ([accountId, url], flags) => {
      const account = required(accountId, 'unipileAccountId')
      const identifier = publicIdentifierFromUrl(required(url, 'linkedinUrl'))
      if (!identifier) throw new Error('Not a linkedin.com/in/ URL')
      const profile = await unipile.getProfile(account, identifier)
      const result: Record<string, unknown> = { profile }
      const token = profile.specifics?.notify_visit_token
      if (flags.visit === true && token) result.visit = await unipile.reportVisit(account, token)
      if (flags.invite !== undefined) {
        const note = typeof flags.invite === 'string' && flags.invite ? flags.invite : undefined
        result.invite = await unipile.sendRelationRequest(account, profile.id, note)
      }
      if (typeof flags.message === 'string') {
        result.message = await unipile.startChat(account, profile.id, flags.message)
      }
      return result
    },
  },

  sync: {
    usage: '',
    run: async () => {
      const accounts = await listRunnableAccounts(new Date())
      return Promise.all(
        accounts.map(async (a) => ({ account: a.name, ...(await syncInvitations(a)) })),
      )
    },
  },

  tick: {
    usage: '',
    run: async () => {
      const accounts = await listRunnableAccounts(new Date())
      return Promise.all(
        accounts.map(async (a) => ({ account: a.name, ...(await runAccountTurn(a)) })),
      )
    },
  },
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing <${name}>`)
  return value
}

function help() {
  console.log('Usage: pnpm cli <command> [args]\n')
  for (const [name, { usage }] of Object.entries(commands)) console.log(`  ${name} ${usage}`)
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      tz: { type: 'string' },
      warmup: { type: 'boolean' },
      visit: { type: 'boolean' },
      invite: { type: 'string' },
      message: { type: 'string' },
    },
  })
  const [name, ...args] = positionals
  const command = name ? commands[name] : undefined
  if (!command) return help()
  const result = await command.run(args, values)
  console.dir(result, { depth: 6 })
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeDb)
