import { campaignSummaries } from '@sp/core'
import { Megaphone, Plus } from 'lucide-react'
import Link from 'next/link'
import { connection } from 'next/server'
import { CampaignTable } from '@/components/campaigns/campaign-table'
import { AutoRefresh } from '@/components/shell/auto-refresh'
import { EmptyState, PageHeader } from '@/components/shell/page'
import { Button } from '@/components/ui/button'

export default async function CampaignsPage() {
  await connection()
  const campaigns = await campaignSummaries()
  const newButton = (
    <Link href="/campaigns/new">
      <Button variant="primary">
        <Plus className="size-3.5" />
        New campaign
      </Button>
    </Link>
  )
  return (
    <>
      <PageHeader
        title="Campaigns"
        meta={<span className="text-zinc-400 tabular-nums">{campaigns.length}</span>}
        actions={newButton}
      />
      <AutoRefresh seconds={15} />
      <div className="min-h-0 flex-1 overflow-auto">
        {campaigns.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-5" />}
            title="No campaigns yet"
            body="Build a sequence of profile visits, connection requests and messages, then import your leads."
            action={newButton}
          />
        ) : (
          <CampaignTable campaigns={campaigns} />
        )}
      </div>
    </>
  )
}
