import type { CampaignSummary } from '@sp/core'
import Link from 'next/link'
import { Pill } from '@/components/ui/badge'
import { Meter } from '@/components/ui/meter'
import { Table, Td, Th, Tr } from '@/components/ui/table'
import { percent, shortDate } from '@/lib/format'
import { campaignStatuses } from '@/lib/states'

const FINISHED = ['completed', 'replied', 'expired', 'failed', 'stopped'] as const

export function CampaignTable({ campaigns }: { campaigns: CampaignSummary[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-[34%]">Campaign</Th>
          <Th>Status</Th>
          <Th className="text-right">Leads</Th>
          <Th className="w-[18%]">Progress</Th>
          <Th className="text-right">Messaged</Th>
          <Th className="text-right">Replies</Th>
          <Th className="text-right">Created</Th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map((c) => {
          const finished = FINISHED.reduce((sum, state) => sum + (c.states[state] ?? 0), 0)
          const status = campaignStatuses[c.status]
          return (
            <Tr key={c.id} className="relative">
              <Td>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="font-medium text-zinc-900 after:absolute after:inset-0 group-hover:underline group-hover:decoration-zinc-300 group-hover:underline-offset-4"
                >
                  {c.name}
                </Link>
                <span className="ml-2 text-zinc-400">{c.accountName}</span>
              </Td>
              <Td>
                <Pill tone={status.tone}>{status.label}</Pill>
              </Td>
              <Td className="text-right tabular-nums text-zinc-700">{c.leads}</Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Meter value={finished} max={c.leads} className="max-w-28" />
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {finished}/{c.leads}
                  </span>
                </div>
              </Td>
              <Td className="text-right tabular-nums text-zinc-700">{c.messaged}</Td>
              <Td className="text-right tabular-nums">
                <span className="text-zinc-900">{c.replied}</span>
                <span className="ml-1.5 text-zinc-400">{percent(c.replied, c.messaged)}</span>
              </Td>
              <Td className="text-right text-zinc-500">{shortDate(c.createdAt)}</Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}
