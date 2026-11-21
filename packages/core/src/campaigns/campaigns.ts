import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { type Campaign, campaigns } from '../db/schema'
import { stepsSchema } from './steps'

export async function createCampaign(input: {
  accountId: string
  name: string
  steps: unknown
}): Promise<Campaign> {
  const steps = stepsSchema.parse(input.steps)
  const [row] = await db
    .insert(campaigns)
    .values({ accountId: input.accountId, name: input.name, steps })
    .returning()
  if (!row) throw new Error('Failed to create campaign')
  return row
}

export async function setCampaignStatus(id: string, status: Campaign['status']) {
  const [row] = await db.update(campaigns).set({ status }).where(eq(campaigns.id, id)).returning()
  if (!row) throw new Error(`Campaign ${id} not found`)
  return row
}

export function listCampaigns() {
  return db.select().from(campaigns).orderBy(campaigns.createdAt)
}
