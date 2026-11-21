import { type ComponentProps, forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-lg bg-white px-2.5 text-[13px] text-zinc-900 shadow-card placeholder:text-zinc-400 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-accent-500/30 disabled:bg-zinc-50 disabled:text-zinc-500'

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, 'h-8', className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(control, 'min-h-24 resize-y py-2 leading-relaxed', className)}
        {...props}
      />
    )
  },
)

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'h-8 appearance-none pr-7', className)} {...props}>
      {children}
    </select>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  )
}
