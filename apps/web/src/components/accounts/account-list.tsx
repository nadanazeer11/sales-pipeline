'use client'

import type { AccountOverview } from '@sp/core'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar, Pill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/ui/meter'
import { accountStatuses } from '@/lib/states'
import { AccountSettingsSheet } from './account-settings'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function describeSchedule(days: number[], start: number, end: number) {
  const sorted = [...days].sort()
  const contiguous = sorted.every((d, i) => i === 0 || d === (sorted[i - 1] ?? 0) + 1)
  const dayText =
    sorted.length === 7
      ? 'Every day'
      : contiguous && sorted.length > 2
        ? `${DAY_NAMES[(sorted[0] ?? 1) - 1]}–${DAY_NAMES[(sorted.at(-1) ?? 1) - 1]}`
        : sorted.map((d) => DAY_NAMES[d - 1]).join(', ')
  const pad = (h: number) => `${String(h).padStart(2, '0')}:00`
  return `${dayText}, ${pad(start)}–${pad(end)}`
}

export function AccountList({ overviews }: { overviews: AccountOverview[] }) {
  const [editing, setEditing] = useState<AccountOverview | null>(null)
  return (
    <>
      <div className="flex flex-col gap-3">
        {overviews.map((overview) => {
          const { account, usage, effectiveLimits: limits, warmup } = overview
          const status = accountStatuses[account.status]
          const meters = [
            { label: 'Profile views today', value: usage.visitsDay, max: limits.visitsPerDay },
            { label: 'Invites today', value: usage.invitesDay, max: limits.invitesPerDay },
            { label: 'Invites this week', value: usage.invitesWeek, max: limits.invitesPerWeek },
            { label: 'Messages today', value: usage.messagesDay, max: limits.messagesPerDay },
          ]
          return (
            <section key={account.id} className="rounded-xl bg-white shadow-card animate-fade-in">
              <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                <Avatar name={account.name} className="size-8 text-[11px]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{account.name}</span>
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {warmup < 1 && (
                      <Pill tone="violet" dot={false}>
                        Warming up · {Math.round(warmup * 100)}%
                      </Pill>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {describeSchedule(account.workDays, account.workStartHour, account.workEndHour)}{' '}
                    · {account.timezone} · {account.minGapMinutes}–{account.maxGapMinutes} min
                    between actions
                  </div>
                </div>
                <Button size="sm" className="ml-auto" onClick={() => setEditing(overview)}>
                  <Settings2 className="size-3.5" />
                  Settings
                </Button>
              </div>
              {account.pauseReason && (
                <p className="border-b border-zinc-100 bg-amber-50/60 px-4 py-2 text-xs text-amber-800">
                  {account.pauseReason}
                </p>
              )}
              <div className="grid grid-cols-4 gap-6 px-4 py-4">
                {meters.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-zinc-500">{m.label}</span>
                      <span className="text-xs text-zinc-400 tabular-nums">
                        <span className="text-zinc-900">{m.value}</span> / {m.max}
                      </span>
                    </div>
                    <Meter
                      value={m.value}
                      max={m.max}
                      tone={m.value >= m.max ? 'amber' : 'accent'}
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <AccountSettingsSheet overview={editing} onClose={() => setEditing(null)} />
    </>
  )
}
