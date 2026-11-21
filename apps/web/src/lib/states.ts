import type { Account, Campaign, Lead } from '@sp/core'

export type Tone = 'blue' | 'amber' | 'green' | 'zinc' | 'red' | 'outline' | 'violet'

export const leadStates: Record<Lead['state'], { label: string; tone: Tone }> = {
  active: { label: 'In sequence', tone: 'blue' },
  awaiting_accept: { label: 'Invited', tone: 'amber' },
  replied: { label: 'Replied', tone: 'green' },
  completed: { label: 'Finished', tone: 'zinc' },
  expired: { label: 'Not accepted', tone: 'red' },
  failed: { label: 'Failed', tone: 'red' },
  stopped: { label: 'Stopped', tone: 'outline' },
}

export const campaignStatuses: Record<Campaign['status'], { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'outline' },
  active: { label: 'Running', tone: 'green' },
  paused: { label: 'Paused', tone: 'amber' },
  archived: { label: 'Archived', tone: 'zinc' },
}

export const accountStatuses: Record<Account['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'green' },
  paused: { label: 'Paused', tone: 'amber' },
  disconnected: { label: 'Disconnected', tone: 'red' },
}
