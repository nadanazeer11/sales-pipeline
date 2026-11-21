'use client'

import { Inbox, Megaphone, Radar, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const nav = [
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/accounts', label: 'Accounts', icon: UserRound },
]

export function Sidebar({ replies }: { replies: number }) {
  const pathname = usePathname()
  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/70">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="flex size-6 items-center justify-center rounded-md bg-zinc-900 text-white">
          <Radar className="size-3.5" strokeWidth={2.25} />
        </span>
        <span className="text-[14px] font-semibold tracking-tight">Pipeline</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors duration-150',
                active
                  ? 'bg-white text-zinc-900 shadow-card'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-zinc-900' : 'text-zinc-400')} />
              {label}
              {href === '/inbox' && replies > 0 && (
                <span className="ml-auto rounded-full bg-accent-600 px-1.5 text-[11px] leading-[18px] font-semibold text-white tabular-nums">
                  {replies}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
