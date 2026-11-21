import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { Limits } from '../accounts/quota'
import type { Step } from '../campaigns/steps'

const id = () => uuid().primaryKey().defaultRandom()
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
const ts = () => timestamp({ withTimezone: true })

export const accountStatus = pgEnum('account_status', ['active', 'paused', 'disconnected'])
export const campaignStatus = pgEnum('campaign_status', ['draft', 'active', 'paused', 'archived'])
export const leadState = pgEnum('lead_state', [
  'active',
  'awaiting_accept',
  'replied',
  'completed',
  'expired',
  'failed',
  'stopped',
])
export const actionType = pgEnum('action_type', [
  'visit',
  'invite',
  'message',
  'withdraw',
  'lookup',
])
export const actionStatus = pgEnum('action_status', ['ok', 'error'])

export const accounts = pgTable('accounts', {
  id: id(),
  unipileAccountId: text().notNull().unique(),
  name: text().notNull(),
  timezone: text().notNull().default('UTC'),
  workStartHour: integer().notNull().default(9),
  workEndHour: integer().notNull().default(18),
  workDays: integer().array().notNull().default(sql`'{1,2,3,4,5}'`),
  limits: jsonb().$type<Limits>().notNull(),
  minGapMinutes: integer().notNull().default(2),
  maxGapMinutes: integer().notNull().default(8),
  warmupStartedAt: ts(),
  status: accountStatus().notNull().default('active'),
  pausedUntil: ts(),
  pauseReason: text(),
  nextActionAt: ts(),
  createdAt: createdAt(),
})

export const campaigns = pgTable('campaigns', {
  id: id(),
  accountId: uuid()
    .notNull()
    .references(() => accounts.id),
  name: text().notNull(),
  status: campaignStatus().notNull().default('draft'),
  steps: jsonb().$type<Step[]>().notNull(),
  createdAt: createdAt(),
})

export const leads = pgTable(
  'leads',
  {
    id: id(),
    campaignId: uuid()
      .notNull()
      .references(() => campaigns.id),
    linkedinUrl: text().notNull(),
    publicIdentifier: text().notNull(),
    userId: text(),
    firstName: text(),
    lastName: text(),
    company: text(),
    data: jsonb().$type<Record<string, string>>().notNull().default({}),
    state: leadState().notNull().default('active'),
    stepIndex: integer().notNull().default(0),
    nextActionAt: ts().notNull().defaultNow(),
    relationRequestId: text(),
    chatId: text(),
    invitedAt: ts(),
    connectedAt: ts(),
    repliedAt: ts(),
    attempts: integer().notNull().default(0),
    lastError: text(),
    createdAt: createdAt(),
    updatedAt: createdAt().$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex().on(t.campaignId, t.publicIdentifier),
    index().on(t.state, t.nextActionAt),
    index().on(t.userId),
  ],
)

export const actions = pgTable(
  'actions',
  {
    id: id(),
    accountId: uuid()
      .notNull()
      .references(() => accounts.id),
    leadId: uuid().references(() => leads.id),
    type: actionType().notNull(),
    status: actionStatus().notNull(),
    error: text(),
    response: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.accountId, t.type, t.createdAt)],
)

export const webhookEvents = pgTable('webhook_events', {
  id: id(),
  eventKey: text().notNull().unique(),
  type: text().notNull(),
  payload: jsonb().notNull(),
  processedAt: ts(),
  error: text(),
  createdAt: createdAt(),
})

export type Account = typeof accounts.$inferSelect
export type Campaign = typeof campaigns.$inferSelect
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
export type ActionType = (typeof actionType.enumValues)[number]
