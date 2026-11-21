'use server'

import { createAccount, unipile, updateAccountSettings } from '@sp/core'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
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

export async function saveAccountSettingsAction(accountId: string, input: unknown) {
  return attempt(async () => {
    await updateAccountSettings(accountId, input)
    revalidatePath('/accounts')
  })
}

export async function connectLinkedInAction() {
  return attempt(async () => {
    const host = (await headers()).get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const { link } = await unipile.createAuthLink(`${protocol}://${host}/accounts?connected=1`)
    return { link }
  })
}

const addInput = z.object({
  unipileAccountId: z.string().min(1),
  name: z.string().min(1),
  timezone: z.string().min(1),
})

export async function addEngineAccountAction(input: unknown) {
  return attempt(async () => {
    const { unipileAccountId, name, timezone } = addInput.parse(input)
    await createAccount({ unipileAccountId, name, timezone, warmup: true })
    revalidatePath('/accounts')
  })
}
