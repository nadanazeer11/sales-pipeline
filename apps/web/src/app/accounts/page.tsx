import { accountOverviews, logger, unipile } from '@sp/core'
import { UserRound } from 'lucide-react'
import { connection } from 'next/server'
import { AccountList } from '@/components/accounts/account-list'
import { ConnectLinkedInButton, PendingAccounts } from '@/components/accounts/connect'
import { EmptyState, PageHeader } from '@/components/shell/page'

async function unipileAccounts() {
  try {
    return (await unipile.listAccounts()).data
  } catch (error) {
    logger.warn({ err: error }, 'could not list Unipile accounts')
    return []
  }
}

export default async function AccountsPage() {
  await connection()
  const [overviews, remote] = await Promise.all([accountOverviews(), unipileAccounts()])
  const added = new Set(overviews.map((o) => o.account.unipileAccountId))
  const pending = remote
    .filter((a) => !added.has(a.id))
    .map((a) => ({ id: a.id, name: a.name ?? a.id, provider: a.provider }))

  return (
    <>
      <PageHeader title="Accounts" actions={<ConnectLinkedInButton />} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
          <PendingAccounts accounts={pending} />
          {overviews.length === 0 ? (
            <EmptyState
              icon={<UserRound className="size-5" />}
              title="No sending accounts"
              body="Connect a LinkedIn account through Unipile, then add it here to start campaigns."
            />
          ) : (
            <AccountList overviews={overviews} />
          )}
        </div>
      </div>
    </>
  )
}
