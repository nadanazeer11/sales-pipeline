'use client'

import type { LeadDetail, TimelineItem } from '@sp/core'
import {
  CircleSlash,
  ExternalLink,
  Eye,
  Link2,
  MessageCircle,
  Reply,
  Undo2,
  UserPlus,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { leadDetailAction, stopLeadAction } from '@/app/campaigns/actions'
import { Avatar, Pill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'
import { shortDate } from '@/lib/format'
import { leadStates } from '@/lib/states'

const events: Record<TimelineItem['kind'], { label: string; icon: ReactNode }> = {
  visit: { label: 'Viewed profile', icon: <Eye className="size-3.5" /> },
  invite: { label: 'Sent connection request', icon: <UserPlus className="size-3.5" /> },
  connected: { label: 'Connected', icon: <Link2 className="size-3.5" /> },
  message: { label: 'Sent message', icon: <MessageCircle className="size-3.5" /> },
  reply: { label: 'Replied', icon: <Reply className="size-3.5" /> },
  withdraw: { label: 'Withdrew request', icon: <Undo2 className="size-3.5" /> },
}

export function LeadSheet({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const router = useRouter()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [stopping, startStopping] = useTransition()

  useEffect(() => {
    if (!leadId) return
    let cancelled = false
    setLead(null)
    leadDetailAction(leadId).then((result) => {
      if (cancelled) return
      if (result.ok) setLead(result.data)
      else toast.error(result.error)
    })
    return () => {
      cancelled = true
    }
  }, [leadId])

  const stop = () =>
    startStopping(async () => {
      if (!lead) return
      const result = await stopLeadAction(lead.id)
      if (!result.ok) return void toast.error(result.error)
      toast.success(`Stopped the sequence for ${lead.name}`)
      setLead({ ...lead, state: 'stopped' })
      router.refresh()
    })

  const open = lead?.state === 'active' || lead?.state === 'awaiting_accept'

  return (
    <Sheet
      open={leadId !== null}
      onOpenChange={(next) => !next && onClose()}
      title={
        lead ? (
          <span className="flex items-center gap-2.5">
            <Avatar name={lead.name} className="size-7 text-[11px]" />
            {lead.name}
          </span>
        ) : (
          'Loading…'
        )
      }
      description={lead ? [lead.company, lead.campaignName].filter(Boolean).join(' · ') : undefined}
      footer={
        lead && (
          <>
            <a href={lead.linkedinUrl} target="_blank" rel="noreferrer">
              <Button size="sm">
                <ExternalLink className="size-3.5" />
                LinkedIn profile
              </Button>
            </a>
            {open && (
              <Button
                size="sm"
                variant="danger"
                className="ml-auto"
                onClick={stop}
                disabled={stopping}
              >
                <CircleSlash className="size-3.5" />
                Stop sequence
              </Button>
            )}
          </>
        )
      }
    >
      {lead ? <LeadBody lead={lead} /> : <SheetSkeleton />}
    </Sheet>
  )
}

function LeadBody({ lead }: { lead: LeadDetail }) {
  const state = leadStates[lead.state]
  const progress = Math.min(lead.stepIndex, lead.totalSteps)
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-100 shadow-card">
        <Stat label="Status">
          <Pill tone={state.tone}>{state.label}</Pill>
        </Stat>
        <Stat label="Progress">
          <span className="tabular-nums">
            {progress} of {lead.totalSteps} steps
          </span>
        </Stat>
        <Stat label="Step" className="col-span-2">
          {lead.step}
        </Stat>
      </div>

      {lead.lastError && lead.state !== 'completed' && (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">{lead.lastError}</p>
      )}

      <div>
        <h3 className="mb-3 text-xs font-medium text-zinc-500">Activity</h3>
        {lead.timeline.length === 0 ? (
          <p className="text-[13px] text-zinc-400">Nothing has happened yet.</p>
        ) : (
          <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-zinc-200">
            {lead.timeline.map((item) => (
              <TimelineRow key={`${item.kind}-${new Date(item.at).getTime()}`} item={item} />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const event = events[item.kind]
  const failed = 'ok' in item && !item.ok
  const text = 'text' in item ? item.text : undefined
  const isReply = item.kind === 'reply'
  return (
    <li className="relative flex gap-3">
      <span
        className={cn(
          'z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-card',
          isReply ? 'text-emerald-600' : failed ? 'text-red-500' : 'text-zinc-500',
        )}
      >
        {event.icon}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn('text-[13px] font-medium', failed ? 'text-red-600' : 'text-zinc-800')}
          >
            {failed ? `${event.label} failed` : event.label}
          </span>
          <span className="shrink-0 text-xs text-zinc-400">{shortDate(item.at)}</span>
        </div>
        {text && (
          <p
            className={cn(
              'mt-1.5 rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap',
              isReply ? 'bg-emerald-50 text-emerald-900' : 'bg-zinc-50 text-zinc-700',
            )}
          >
            {text}
          </p>
        )}
        {failed && 'error' in item && item.error && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.error}</p>
        )}
      </div>
    </li>
  )
}

function Stat({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-white px-3 py-2.5', className)}>
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-[13px] text-zinc-800">{children}</div>
    </div>
  )
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[
        ['a', 64],
        ['b', 40],
        ['c', 40],
        ['d', 40],
      ].map(([key, h]) => (
        <div key={key} className="animate-pulse rounded-lg bg-zinc-100" style={{ height: h }} />
      ))}
    </div>
  )
}
