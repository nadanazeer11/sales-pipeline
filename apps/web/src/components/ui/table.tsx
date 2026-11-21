import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table className={cn('w-full border-collapse text-[13px]', className)} {...props} />
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'sticky top-0 z-10 h-9 border-b border-zinc-200 bg-white px-3 text-left text-xs font-medium whitespace-nowrap text-zinc-500 first:pl-5 last:pr-5',
        className,
      )}
      {...props}
    />
  )
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'group border-b border-zinc-100 transition-colors duration-100 hover:bg-zinc-50/80',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td className={cn('h-10 px-3 whitespace-nowrap first:pl-5 last:pr-5', className)} {...props} />
  )
}
