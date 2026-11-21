'use client'

import type { Lead, LeadRow } from '@sp/core'
import { useMemo, useState } from 'react'
import { Avatar, Pill } from '@/components/ui/badge'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { leadStates } from '@/lib/states'
import { LeadSheet } from './lead-sheet'

type Filter = 'all' | Lead['state']

const OPEN: Lead['state'][] = ['active', 'awaiting_accept']

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['all', leads.length]])
    for (const lead of leads) map.set(lead.state, (map.get(lead.state) ?? 0) + 1)
    return map
  }, [leads])

  const visible = filter === 'all' ? leads : leads.filter((l) => l.state === filter)
  const filters: Filter[] = [
    'all',
    ...(Object.keys(leadStates) as Lead['state'][]).filter((s) => counts.has(s)),
  ]

  return (
    <>
      <div className="flex items-center gap-1 border-b border-zinc-200 px-4 py-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150',
              filter === f
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
            )}
          >
            {f === 'all' ? 'All leads' : leadStates[f].label}
            <span className="text-xs text-zinc-400 tabular-nums">{counts.get(f) ?? 0}</span>
          </button>
        ))}
      </div>
      <Table>
        <thead>
          <tr>
            <Th className="w-[26%]">Name</Th>
            <Th>Company</Th>
            <Th>Status</Th>
            <Th>Step</Th>
            <Th>Last activity</Th>
            <Th className="text-right">Next action</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((lead) => {
            const state = leadStates[lead.state]
            const open = OPEN.includes(lead.state)
            return (
              <Tr
                key={lead.id}
                onClick={() => setSelected(lead.id)}
                className={cn('cursor-pointer', selected === lead.id && 'bg-accent-50/50')}
              >
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={lead.name} />
                    <span className="font-medium text-zinc-900 group-hover:underline group-hover:decoration-zinc-300 group-hover:underline-offset-4">
                      {lead.name}
                    </span>
                  </div>
                </Td>
                <Td className="text-zinc-600">
                  {lead.company ?? <span className="text-zinc-300">—</span>}
                </Td>
                <Td>
                  <Pill tone={state.tone}>{state.label}</Pill>
                </Td>
                <Td className="text-zinc-600">{lead.step}</Td>
                <Td className="text-zinc-500">{timeAgo(lead.lastActivityAt)}</Td>
                <Td className="text-right text-zinc-500">
                  {open ? timeAgo(lead.nextActionAt) : <span className="text-zinc-300">—</span>}
                </Td>
              </Tr>
            )
          })}
        </tbody>
      </Table>
      <LeadSheet leadId={selected} onClose={() => setSelected(null)} />
    </>
  )
}
