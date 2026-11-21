'use client'

import type { Campaign } from '@sp/core'
import { Pause, Play } from 'lucide-react'
import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { setStatusAction } from '@/app/campaigns/actions'
import { Pill } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { campaignStatuses } from '@/lib/states'

export function StatusToggle({
  campaignId,
  status,
  leads,
}: {
  campaignId: string
  status: Campaign['status']
  leads: number
}) {
  const [optimistic, setOptimistic] = useOptimistic(status)
  const [pending, startTransition] = useTransition()
  const running = optimistic === 'active'
  const meta = campaignStatuses[optimistic]

  const toggle = () => {
    const next = running ? 'paused' : 'active'
    startTransition(async () => {
      setOptimistic(next)
      const result = await setStatusAction(campaignId, next)
      if (!result.ok) toast.error(result.error)
      else toast.success(next === 'active' ? 'Campaign started' : 'Campaign paused')
    })
  }

  return (
    <>
      <Pill tone={meta.tone}>{meta.label}</Pill>
      <Button
        variant={running ? 'secondary' : 'accent'}
        onClick={toggle}
        disabled={pending || (!running && leads === 0)}
        title={!running && leads === 0 ? 'Import leads before starting' : undefined}
      >
        {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {running ? 'Pause' : optimistic === 'draft' ? 'Start campaign' : 'Resume'}
      </Button>
    </>
  )
}
