import { type ComponentProps, forwardRef } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm disabled:bg-zinc-300',
  accent: 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm disabled:bg-accent-100',
  secondary:
    'bg-white text-zinc-800 shadow-card hover:bg-zinc-50 disabled:text-zinc-400 disabled:hover:bg-white',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:text-zinc-300',
  danger: 'bg-white text-red-600 shadow-card hover:bg-red-50 disabled:text-red-300',
}

const sizes = {
  sm: 'h-7 px-2.5 text-[13px] gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-2 rounded-lg',
  icon: 'h-7 w-7 justify-center rounded-md',
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center font-medium whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
