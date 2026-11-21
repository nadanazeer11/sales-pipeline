import { inboxReplies } from '@sp/core'
import { Inbox } from 'lucide-react'
import { connection } from 'next/server'
import { InboxList } from '@/components/leads/inbox-list'
import { AutoRefresh } from '@/components/shell/auto-refresh'
import { EmptyState, PageHeader } from '@/components/shell/page'

export default async function InboxPage() {
  await connection()
  const items = await inboxReplies()
  return (
    <>
      <PageHeader
        title="Inbox"
        meta={<span className="text-zinc-400 tabular-nums">{items.length}</span>}
      />
      <AutoRefresh seconds={10} />
      <div className="min-h-0 flex-1 overflow-auto">
        {items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title="No replies yet"
            body="When someone answers one of your messages, their reply lands here and their sequence stops."
          />
        ) : (
          <div className="mx-auto max-w-3xl">
            <InboxList items={items} />
          </div>
        )}
      </div>
    </>
  )
}
