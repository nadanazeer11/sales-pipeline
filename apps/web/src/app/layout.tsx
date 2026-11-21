import { inboxReplies } from '@sp/core'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { connection } from 'next/server'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { Sidebar } from '@/components/shell/sidebar'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = { title: 'Pipeline', description: 'LinkedIn sequences' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection()
  const replies = await inboxReplies(50)
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <div className="flex h-screen overflow-hidden">
          <Sidebar replies={replies.length} />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{ className: '!text-[13px] !rounded-lg !shadow-panel !border-0' }}
        />
      </body>
    </html>
  )
}
