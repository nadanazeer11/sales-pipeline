import { campaignDetail, campaignLeads } from '@sp/core'
import { Users } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { SequenceEditor } from '@/components/campaigns/campaign-forms'
import { FunnelStrip } from '@/components/campaigns/funnel'
import { ImportDialog } from '@/components/campaigns/import-dialog'
import { StatusToggle } from '@/components/campaigns/status-toggle'
import { LeadsTable } from '@/components/leads/leads-table'
import { AutoRefresh } from '@/components/shell/auto-refresh'
import { EmptyState, PageHeader } from '@/components/shell/page'
import { cn } from '@/lib/cn'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function CampaignPage({ params, searchParams }: Props) {
  await connection()
  const { id } = await params
  const { tab = 'leads' } = await searchParams
  const detail = await campaignDetail(id)
  if (!detail) notFound()
  const leads = tab === 'leads' ? await campaignLeads(id) : []
  const { campaign, funnel, accountName } = detail

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/campaigns" className="transition-colors hover:text-zinc-700">
            Campaigns
          </Link>
        }
        title={campaign.name}
        meta={<span className="text-zinc-400">· {accountName}</span>}
        actions={
          <>
            <ImportDialog campaignId={campaign.id} />
            <StatusToggle campaignId={campaign.id} status={campaign.status} leads={funnel.leads} />
          </>
        }
      />
      <AutoRefresh seconds={10} />
      <FunnelStrip funnel={funnel} />
      <nav className="flex gap-5 border-b border-zinc-200 px-5">
        {[
          { key: 'leads', label: 'Leads' },
          { key: 'sequence', label: 'Sequence' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            scroll={false}
            className={cn(
              '-mb-px border-b-2 py-2.5 text-[13px] font-medium transition-colors duration-150',
              tab === t.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-800',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === 'sequence' ? (
        <SequenceEditor
          campaignId={campaign.id}
          initialSteps={campaign.steps}
          editable={campaign.status === 'draft'}
        />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No leads yet"
          body="Import a CSV with LinkedIn profile URLs. Extra columns become variables in your messages."
          action={<ImportDialog campaignId={campaign.id} />}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <LeadsTable leads={leads} />
        </div>
      )}
    </>
  )
}
