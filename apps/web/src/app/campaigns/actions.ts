'use server'

import {
  createCampaign,
  importLeads,
  leadDetail,
  parseLeadsCsv,
  setCampaignStatus,
  stopLead,
  updateDraftSteps,
} from '@sp/core'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

async function attempt<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: error.issues.map((i) => i.message).join('. ') }
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Something went wrong' }
  }
}

const createInput = z.object({
  name: z.string().trim().min(1, 'Give the campaign a name'),
  accountId: z.string().uuid('Pick an account'),
  steps: z.unknown(),
})

export async function createCampaignAction(input: unknown) {
  return attempt(async () => {
    const { name, accountId, steps } = createInput.parse(input)
    const campaign = await createCampaign({ name, accountId, steps })
    revalidatePath('/campaigns')
    return { id: campaign.id }
  })
}

export async function updateStepsAction(campaignId: string, steps: unknown) {
  return attempt(async () => {
    await updateDraftSteps(campaignId, steps)
    revalidatePath(`/campaigns/${campaignId}`)
  })
}

const statusInput = z.enum(['active', 'paused', 'archived'])

export async function setStatusAction(campaignId: string, status: unknown) {
  return attempt(async () => {
    await setCampaignStatus(campaignId, statusInput.parse(status))
    revalidatePath(`/campaigns/${campaignId}`)
    revalidatePath('/campaigns')
  })
}

export async function importLeadsAction(campaignId: string, csv: string) {
  return attempt(async () => {
    const { rows, skipped } = parseLeadsCsv(csv, campaignId)
    const imported = await importLeads(rows)
    revalidatePath(`/campaigns/${campaignId}`)
    return { imported, duplicates: rows.length - imported, skipped: skipped.length }
  })
}

export async function leadDetailAction(leadId: string) {
  return attempt(async () => {
    const detail = await leadDetail(leadId)
    if (!detail) throw new Error('Lead not found')
    return detail
  })
}

export async function stopLeadAction(leadId: string) {
  return attempt(async () => {
    const stopped = await stopLead(leadId)
    if (!stopped) throw new Error('This lead is no longer in an active sequence')
    revalidatePath('/campaigns', 'layout')
  })
}
