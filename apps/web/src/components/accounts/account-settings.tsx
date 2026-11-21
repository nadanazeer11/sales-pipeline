'use client'

import type { AccountOverview } from '@sp/core'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { saveAccountSettingsAction } from '@/app/accounts/actions'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Sheet } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

type Form = {
  timezone: string
  workStartHour: number
  workEndHour: number
  workDays: number[]
  minGapMinutes: number
  maxGapMinutes: number
  limits: {
    visitsPerDay: number
    invitesPerDay: number
    invitesPerWeek: number
    messagesPerDay: number
  }
  warmup: boolean
}

function toForm({ account }: AccountOverview): Form {
  return {
    timezone: account.timezone,
    workStartHour: account.workStartHour,
    workEndHour: account.workEndHour,
    workDays: account.workDays,
    minGapMinutes: account.minGapMinutes,
    maxGapMinutes: account.maxGapMinutes,
    limits: account.limits,
    warmup: account.warmupStartedAt !== null,
  }
}

export function AccountSettingsSheet({
  overview,
  onClose,
}: {
  overview: AccountOverview | null
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<Form | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (overview) setForm(toForm(overview))
  }, [overview])

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))
  const setLimit = (key: keyof Form['limits'], value: number) =>
    setForm((f) => (f ? { ...f, limits: { ...f.limits, [key]: value } } : f))
  const num = (value: string) => Math.max(0, Math.round(Number(value) || 0))

  const save = () =>
    startTransition(async () => {
      if (!overview || !form) return
      const result = await saveAccountSettingsAction(overview.account.id, form)
      if (!result.ok) return void toast.error(result.error)
      toast.success('Settings saved')
      router.refresh()
      onClose()
    })

  return (
    <Sheet
      open={overview !== null}
      onOpenChange={(open) => !open && onClose()}
      title={overview?.account.name ?? ''}
      description="Pacing and safety limits for this LinkedIn account"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="ml-auto" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save settings'}
          </Button>
        </>
      }
    >
      {form && (
        <div className="flex flex-col gap-6">
          <Section title="Working hours">
            <Field label="Timezone">
              <Input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start hour">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={form.workStartHour}
                  onChange={(e) => set('workStartHour', num(e.target.value))}
                />
              </Field>
              <Field label="End hour">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={form.workEndHour}
                  onChange={(e) => set('workEndHour', num(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Days">
              <div className="flex gap-1">
                {DAYS.map((label, i) => {
                  const day = i + 1
                  const on = form.workDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        set(
                          'workDays',
                          on
                            ? form.workDays.filter((d) => d !== day)
                            : [...form.workDays, day].sort(),
                        )
                      }
                      className={cn(
                        'size-8 rounded-lg text-xs font-medium transition-colors duration-150',
                        on
                          ? 'bg-zinc-900 text-white'
                          : 'bg-white text-zinc-500 shadow-card hover:bg-zinc-50',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </Section>

          <Section title="Daily limits" hint="Kept well under LinkedIn's thresholds. Raise slowly.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Profile views / day">
                <Input
                  type="number"
                  min={0}
                  value={form.limits.visitsPerDay}
                  onChange={(e) => setLimit('visitsPerDay', num(e.target.value))}
                />
              </Field>
              <Field label="Messages / day">
                <Input
                  type="number"
                  min={0}
                  value={form.limits.messagesPerDay}
                  onChange={(e) => setLimit('messagesPerDay', num(e.target.value))}
                />
              </Field>
              <Field label="Invites / day">
                <Input
                  type="number"
                  min={0}
                  value={form.limits.invitesPerDay}
                  onChange={(e) => setLimit('invitesPerDay', num(e.target.value))}
                />
              </Field>
              <Field label="Invites / week" hint="~100 is the common safe ceiling">
                <Input
                  type="number"
                  min={0}
                  value={form.limits.invitesPerWeek}
                  onChange={(e) => setLimit('invitesPerWeek', num(e.target.value))}
                />
              </Field>
            </div>
          </Section>

          <Section title="Pacing">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min minutes between actions">
                <Input
                  type="number"
                  min={0}
                  value={form.minGapMinutes}
                  onChange={(e) => set('minGapMinutes', num(e.target.value))}
                />
              </Field>
              <Field label="Max minutes between actions">
                <Input
                  type="number"
                  min={0}
                  value={form.maxGapMinutes}
                  onChange={(e) => set('maxGapMinutes', num(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-zinc-50 p-3">
              <input
                type="checkbox"
                checked={form.warmup}
                onChange={(e) => set('warmup', e.target.checked)}
                className="mt-0.5 size-4 accent-zinc-900"
              />
              <span>
                <span className="block text-[13px] font-medium">Warm-up</span>
                <span className="text-xs text-zinc-500">
                  Start at 30% of the limits and ramp to 100% over three weeks.
                </span>
              </span>
            </label>
          </Section>
        </div>
      )}
    </Sheet>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-zinc-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
