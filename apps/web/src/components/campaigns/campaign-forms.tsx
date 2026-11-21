'use client'

import { type Step, stepsSchema } from '@sp/core/steps'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createCampaignAction, updateStepsAction } from '@/app/campaigns/actions'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { DEFAULT_STEPS, SequencePreview, StepBuilder } from './step-builder'

function validate(steps: Step[]): string | null {
  const result = stepsSchema.safeParse(steps)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Check the sequence')
}

export function NewCampaignForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS)
  const [pending, startTransition] = useTransition()
  const problem = validate(steps)

  const submit = () =>
    startTransition(async () => {
      const result = await createCampaignAction({ name, accountId, steps })
      if (!result.ok) return void toast.error(result.error)
      toast.success('Campaign created. Import leads to get started.')
      router.push(`/campaigns/${result.data.id}`)
    })

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] overflow-hidden">
      <div className="overflow-y-auto px-8 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Campaign name">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fintech founders, Q1"
              />
            </Field>
            <Field label="Send from">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-medium text-zinc-600">Sequence</h2>
            <StepBuilder steps={steps} onChange={setSteps} />
          </div>
        </div>
      </div>
      <aside className="flex flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-zinc-50/60 p-5">
        <SequencePreview steps={steps} />
        <div className="mt-auto flex flex-col gap-2">
          {problem && <p className="text-xs text-red-600">{problem}</p>}
          <Button
            variant="primary"
            className="justify-center"
            onClick={submit}
            disabled={pending || !name.trim() || !accountId || Boolean(problem)}
          >
            {pending ? 'Creating…' : 'Create campaign'}
          </Button>
          <p className="text-center text-xs text-zinc-400">
            Saved as a draft. Nothing is sent yet.
          </p>
        </div>
      </aside>
    </div>
  )
}

export function SequenceEditor({
  campaignId,
  initialSteps,
  editable,
}: {
  campaignId: string
  initialSteps: Step[]
  editable: boolean
}) {
  const router = useRouter()
  const [steps, setSteps] = useState(initialSteps)
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(steps) !== JSON.stringify(initialSteps)
  const problem = validate(steps)

  const save = () =>
    startTransition(async () => {
      const result = await updateStepsAction(campaignId, steps)
      if (!result.ok) return void toast.error(result.error)
      toast.success('Sequence saved')
      router.refresh()
    })

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] overflow-hidden">
      <div className="overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          {!editable && (
            <p className="mb-4 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              The sequence is locked once a campaign has started, so leads already in it stay
              consistent.
            </p>
          )}
          <StepBuilder steps={steps} onChange={setSteps} readOnly={!editable} />
        </div>
      </div>
      <aside className="flex flex-col gap-4 overflow-y-auto border-l border-zinc-200 bg-zinc-50/60 p-5">
        <SequencePreview steps={steps} />
        {editable && (
          <div className="mt-auto flex flex-col gap-2">
            {problem && <p className="text-xs text-red-600">{problem}</p>}
            <Button
              variant="primary"
              className="justify-center"
              onClick={save}
              disabled={!dirty || pending || Boolean(problem)}
            >
              {pending ? 'Saving…' : dirty ? 'Save sequence' : 'Saved'}
            </Button>
          </div>
        )}
      </aside>
    </div>
  )
}
