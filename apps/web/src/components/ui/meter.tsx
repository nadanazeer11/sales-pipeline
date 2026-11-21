import { cn } from '@/lib/cn'

export function Meter({
  value,
  max,
  className,
  tone = 'accent',
}: {
  value: number
  max: number
  className?: string
  tone?: 'accent' | 'green' | 'amber'
}) {
  const ratio = max === 0 ? 0 : Math.min(1, value / max)
  const fill = { accent: 'bg-accent-500', green: 'bg-emerald-500', amber: 'bg-amber-500' }[tone]
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fill)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}
