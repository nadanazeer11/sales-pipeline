import { listAccounts } from '@sp/core'
import Link from 'next/link'
import { connection } from 'next/server'
import { NewCampaignForm } from '@/components/campaigns/campaign-forms'
import { PageHeader } from '@/components/shell/page'

export default async function NewCampaignPage() {
  await connection()
  const accounts = (await listAccounts()).map((a) => ({ id: a.id, name: a.name }))
  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/campaigns" className="transition-colors hover:text-zinc-700">
            Campaigns
          </Link>
        }
        title="New campaign"
      />
      <NewCampaignForm accounts={accounts} />
    </>
  )
}
