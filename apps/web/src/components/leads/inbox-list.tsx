'use client'

import type { InboxItem } from '@sp/core'
import { useState } from 'react'
import { Avatar } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { LeadSheet } from './lead-sheet'

export function InboxList({ items }: { items: InboxItem[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.leadId}>
            <button
              type="button"
              onClick={() => setSelected(item.leadId)}
              className={cn(
                'flex w-full items-start gap-3 border-b border-zinc-100 px-5 py-3.5 text-left transition-colors duration-100 hover:bg-zinc-50/80',
                selected === item.leadId && 'bg-accent-50/50',
              )}
            >
              <Avatar name={item.name} className="mt-0.5 size-8 text-[11px]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-zinc-900">{item.name}</span>
                  {item.company && <span className="text-xs text-zinc-400">{item.company}</span>}
                  <span className="ml-auto shrink-0 text-xs text-zinc-400">
                    {timeAgo(item.repliedAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-zinc-600">
                  {item.text ?? (
                    <span className="text-zinc-400">Replied (message not captured)</span>
                  )}
                </p>
                <span className="mt-1.5 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
                  {item.campaignName}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <LeadSheet leadId={selected} onClose={() => setSelected(null)} />
    </>
  )
}
