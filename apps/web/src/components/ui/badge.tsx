import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Tone } from '@/lib/states'

const tones: Record<Tone, string> = {
  blue: 'bg-accent-50 text-accent-700 [--dot:var(--color-accent-500)]',
  amber: 'bg-amber-50 text-amber-800 [--dot:var(--color-amber-500)]',
  green: 'bg-emerald-50 text-emerald-700 [--dot:var(--color-emerald-500)]',
  zinc: 'bg-zinc-100 text-zinc-600 [--dot:var(--color-zinc-400)]',
  red: 'bg-red-50 text-red-700 [--dot:var(--color-red-500)]',
  violet: 'bg-violet-50 text-violet-700 [--dot:var(--color-violet-500)]',
  outline: 'text-zinc-600 ring-1 ring-inset ring-zinc-200 [--dot:var(--color-zinc-400)]',
}

export function Pill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-(--dot)" />}
      {children}
    </span>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const hue = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white',
        className,
      )}
      style={{ background: `oklch(0.62 0.12 ${hue})` }}
      aria-hidden
    >
      {name
        .split(/[\s-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')}
    </span>
  )
}
