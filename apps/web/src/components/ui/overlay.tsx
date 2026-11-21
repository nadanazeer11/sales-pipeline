'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type OverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

function Header({ title, description }: Pick<OverlayProps, 'title' | 'description'>) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
      <div className="min-w-0">
        <Dialog.Title className="text-[15px] font-semibold tracking-tight text-zinc-900">
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description className="mt-1 text-[13px] text-zinc-500">
            {description}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
      </div>
      <Dialog.Close className="-mt-1 -mr-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40">
        <X className="size-4" />
      </Dialog.Close>
    </div>
  )
}

export function Sheet({ open, onOpenChange, title, description, children, footer }: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/[0.02] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            'fixed top-3 right-3 bottom-3 z-50 flex w-[440px] max-w-[calc(100vw-24px)] flex-col rounded-xl bg-white shadow-panel focus:outline-none data-[state=open]:animate-panel-in',
          )}
        >
          <Header title={title} description={description} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="flex items-center gap-2 border-t border-zinc-100 px-5 py-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Modal({ open, onOpenChange, title, description, children, footer }: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[560px] max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col rounded-xl bg-white shadow-panel focus:outline-none data-[state=open]:animate-pop-in">
          <Header title={title} description={description} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
