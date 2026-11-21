'use client'

import { FileUp, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type DragEvent, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { importLeadsAction } from '@/app/campaigns/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

const CORE = new Set(['linkedin_url', 'first_name', 'last_name', 'company'])

function preview(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return { headers, rows: Math.max(0, lines.length - 1) }
}

export function ImportDialog({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const [dragging, setDragging] = useState(false)
  const [pending, startTransition] = useTransition()
  const { headers, rows } = useMemo(() => preview(csv), [csv])
  const hasUrl = headers.includes('linkedin_url')

  const onDrop = async (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) setCsv(await file.text())
  }

  const submit = () =>
    startTransition(async () => {
      const result = await importLeadsAction(campaignId, csv)
      if (!result.ok) return void toast.error(result.error)
      const { imported, duplicates, skipped } = result.data
      toast.success(
        `Imported ${imported} lead${imported === 1 ? '' : 's'}` +
          (duplicates ? ` · ${duplicates} already in campaign` : '') +
          (skipped ? ` · ${skipped} without a LinkedIn URL` : ''),
      )
      setOpen(false)
      setCsv('')
      router.refresh()
    })

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="size-3.5" />
        Import leads
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Import leads"
        description="A CSV with a linkedin_url column. Any other column becomes a template variable."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={!hasUrl || rows === 0 || pending}>
              {pending
                ? 'Importing…'
                : rows > 0
                  ? `Import ${rows} lead${rows === 1 ? '' : 's'}`
                  : 'Import'}
            </Button>
          </>
        }
      >
        <section
          aria-label="CSV input, drop a file here"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'relative rounded-lg transition-shadow duration-150',
            dragging && 'ring-2 ring-accent-500/40',
          )}
        >
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={
              'linkedin_url,first_name,company\nhttps://www.linkedin.com/in/jane-cooper,Jane,Acme'
            }
            className="min-h-40 font-mono text-xs"
          />
          {!csv && (
            <label className="absolute right-2 bottom-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs text-zinc-500 shadow-card hover:text-zinc-800">
              <FileUp className="size-3.5" />
              Choose file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) setCsv(await file.text())
                }}
              />
            </label>
          )}
        </section>
        {csv && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 animate-fade-in">
            {headers.map((h) => (
              <span
                key={h}
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-[11px]',
                  CORE.has(h) ? 'bg-zinc-100 text-zinc-700' : 'bg-accent-50 text-accent-700',
                )}
              >
                {CORE.has(h) ? h : `{{${h}}}`}
              </span>
            ))}
            {!hasUrl && <span className="text-xs text-red-600">Missing a linkedin_url column</span>}
          </div>
        )}
      </Modal>
    </>
  )
}
