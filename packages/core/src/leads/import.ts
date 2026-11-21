import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { db } from '../db/client'
import { leads, type NewLead } from '../db/schema'

const CORE_COLUMNS = new Set(['linkedin_url', 'first_name', 'last_name', 'company'])

const rowSchema = z.record(z.string(), z.string()).refine((r) => Boolean(r.linkedin_url), {
  message: 'linkedin_url column is required',
})

export function publicIdentifierFromUrl(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : null
}

export function parseLeadsCsv(
  csv: string,
  campaignId: string,
): { rows: NewLead[]; skipped: string[] } {
  const records: unknown[] = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })
  const rows: NewLead[] = []
  const skipped: string[] = []
  for (const record of records) {
    const r = rowSchema.parse(record)
    const url = r.linkedin_url ?? ''
    const publicIdentifier = publicIdentifierFromUrl(url)
    if (!publicIdentifier) {
      skipped.push(url)
      continue
    }
    const data = Object.fromEntries(Object.entries(r).filter(([k]) => !CORE_COLUMNS.has(k)))
    rows.push({
      campaignId,
      linkedinUrl: url,
      publicIdentifier,
      firstName: r.first_name || null,
      lastName: r.last_name || null,
      company: r.company || null,
      data,
    })
  }
  return { rows, skipped }
}

export async function importLeads(rows: NewLead[]): Promise<number> {
  if (rows.length === 0) return 0
  const inserted = await db
    .insert(leads)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: leads.id })
  return inserted.length
}
