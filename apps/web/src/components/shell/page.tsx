import type { ReactNode } from 'react'

export function PageHeader({
  title,
  breadcrumb,
  meta,
  actions,
}: {
  title: ReactNode
  breadcrumb?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-5">
      <div className="flex min-w-0 items-center gap-2 text-[14px]">
        {breadcrumb && (
          <>
            <span className="text-zinc-400">{breadcrumb}</span>
            <span className="text-zinc-300">/</span>
          </>
        )}
        <h1 className="truncate font-semibold tracking-tight text-zinc-900">{title}</h1>
        {meta}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center animate-fade-in">
      <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
        {icon}
      </span>
      <div>
        <p className="text-[14px] font-medium text-zinc-900">{title}</p>
        <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{body}</p>
      </div>
      {action}
    </div>
  )
}
