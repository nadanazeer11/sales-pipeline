'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { addEngineAccountAction, connectLinkedInAction } from '@/app/accounts/actions'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function ConnectLinkedInButton() {
  const [pending, startTransition] = useTransition()
  const connect = () =>
    startTransition(async () => {
      const result = await connectLinkedInAction()
      if (!result.ok) return void toast.error(result.error)
      window.location.href = result.data.link
    })
  return (
    <Button variant="primary" onClick={connect} disabled={pending}>
      <Plus className="size-3.5" />
      {pending ? 'Opening…' : 'Connect LinkedIn'}
    </Button>
  )
}

export function PendingAccounts({
  accounts,
}: {
  accounts: { id: string; name: string; provider: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const add = (account: { id: string; name: string }) =>
    startTransition(async () => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await addEngineAccountAction({
        unipileAccountId: account.id,
        name: account.name,
        timezone,
      })
      if (!result.ok) return void toast.error(result.error)
      toast.success(`${account.name} is ready to send, starting with warm-up limits`)
      router.refresh()
    })
  if (accounts.length === 0) return null
  return (
    <section className="rounded-xl border border-dashed border-zinc-300 p-4 animate-fade-in">
      <h2 className="text-[13px] font-semibold">Connected in Unipile, not used yet</h2>
      <p className="mt-0.5 text-xs text-zinc-500">
        Add an account to start sending campaigns from it.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {accounts.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-card"
          >
            <Avatar name={a.name} />
            <span className="text-[13px] font-medium">{a.name}</span>
            <span className="text-xs text-zinc-400">{a.provider}</span>
            <Button size="sm" className="ml-auto" onClick={() => add(a)} disabled={pending}>
              Add account
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
