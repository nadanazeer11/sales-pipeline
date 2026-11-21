'use client'

import { MAX_MESSAGES, render, type Step } from '@sp/core/steps'
import { ArrowDown, ArrowUp, Eye, MessageCircle, Plus, Trash2, UserPlus } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/field'
import { cn } from '@/lib/cn'

export const SAMPLE_LEAD = { firstName: 'Jane', lastName: 'Cooper', company: 'Acme' }

const VARIABLES = ['firstName', 'lastName', 'company']

let keyCounter = 0
const newKey = () => `step-${++keyCounter}`

export const DEFAULT_STEPS: Step[] = [
  { type: 'visit' },
  { type: 'invite', timeoutDays: 21 },
  {
    type: 'message',
    delayDays: 1,
    template:
      'Thanks for connecting, {{firstName}}! Curious how {{company}} handles outbound today?',
  },
  {
    type: 'message',
    delayDays: 3,
    template: 'Hi {{firstName}}, quick follow-up in case this got buried.',
  },
]

const blank: Record<Step['type'], Step> = {
  visit: { type: 'visit' },
  invite: { type: 'invite', timeoutDays: 21 },
  message: { type: 'message', delayDays: 2, template: '' },
}

function title(steps: Step[], index: number) {
  const step = steps[index]
  if (step?.type === 'visit') return 'View profile'
  if (step?.type === 'invite') return 'Connection request'
  const position = steps.slice(0, index).filter((s) => s.type === 'message').length
  return position === 0 ? 'First message' : `Follow-up ${position}`
}

const icons: Record<Step['type'], ReactNode> = {
  visit: <Eye className="size-3.5" />,
  invite: <UserPlus className="size-3.5" />,
  message: <MessageCircle className="size-3.5" />,
}

export function StepBuilder({
  steps,
  onChange,
  readOnly = false,
}: {
  steps: Step[]
  onChange: (steps: Step[]) => void
  readOnly?: boolean
}) {
  const [keys, setKeys] = useState(() => steps.map(newKey))
  const apply = (nextSteps: Step[], nextKeys: string[]) => {
    setKeys(nextKeys)
    onChange(nextSteps)
  }
  const update = (index: number, patch: Partial<Step>) =>
    onChange(steps.map((s, i) => (i === index ? ({ ...s, ...patch } as Step) : s)))
  const move = (index: number, by: number) => {
    const nextSteps = [...steps]
    const nextKeys = [...keys]
    const [step] = nextSteps.splice(index, 1)
    const [key] = nextKeys.splice(index, 1)
    if (step && key) {
      nextSteps.splice(index + by, 0, step)
      nextKeys.splice(index + by, 0, key)
    }
    apply(nextSteps, nextKeys)
  }
  const remove = (index: number) =>
    apply(
      steps.filter((_, i) => i !== index),
      keys.filter((_, i) => i !== index),
    )
  const add = (step: Step) => apply([...steps, step], [...keys, newKey()])
  const messages = steps.filter((s) => s.type === 'message').length

  return (
    <div className="flex flex-col">
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={keys[index] ?? step.type} className="relative flex gap-3 pb-3 last:pb-0">
            {index < steps.length - 1 && (
              <span className="absolute top-8 bottom-0 left-[13px] w-px bg-zinc-200" />
            )}
            <span className="z-10 mt-2.5 flex size-[27px] shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-card">
              {icons[step.type]}
            </span>
            <div className="min-w-0 flex-1 rounded-xl bg-white shadow-card transition-shadow duration-150 focus-within:shadow-[0_0_0_1px_var(--color-accent-500),0_0_0_4px_rgb(61_110_245/0.12)]">
              <div className="flex h-11 items-center gap-2 px-3.5">
                <span className="text-[13px] font-medium text-zinc-900">{title(steps, index)}</span>
                {step.type === 'message' && (
                  <DelayInput
                    value={step.delayDays}
                    readOnly={readOnly}
                    after={
                      index === 0
                        ? 'the campaign starts'
                        : steps[index - 1]?.type === 'invite'
                          ? 'they accept'
                          : 'the previous step'
                    }
                    onChange={(delayDays) => update(index, { delayDays })}
                  />
                )}
                {!readOnly && (
                  <div className="ml-auto flex items-center opacity-60 transition-opacity hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove step"
                      disabled={steps.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {step.type === 'visit' && (
                <p className="border-t border-zinc-100 px-3.5 py-2.5 text-[13px] text-zinc-500">
                  Opens their profile so they see you in “Who viewed your profile”.
                </p>
              )}
              {step.type === 'invite' && (
                <div className="flex flex-col gap-2 border-t border-zinc-100 p-3.5">
                  <TemplateInput
                    value={step.note ?? ''}
                    max={300}
                    readOnly={readOnly}
                    placeholder="Optional note. Leave empty to send without one (best on free accounts)."
                    onChange={(note) => update(index, { note: note || undefined })}
                  />
                  <span className="flex items-center gap-2 text-xs text-zinc-500">
                    Withdraw if not accepted after
                    <Input
                      type="number"
                      min={1}
                      value={step.timeoutDays}
                      disabled={readOnly}
                      onChange={(e) => update(index, { timeoutDays: Number(e.target.value) || 1 })}
                      className="h-6 w-14 px-1.5 text-center text-xs"
                    />
                    days
                  </span>
                </div>
              )}
              {step.type === 'message' && (
                <div className="border-t border-zinc-100 p-3.5">
                  <TemplateInput
                    value={step.template}
                    readOnly={readOnly}
                    placeholder="Write the message…"
                    onChange={(template) => update(index, { template })}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!readOnly && (
        <div className="mt-3 ml-[39px] flex items-center gap-1">
          <span className="mr-1 text-xs text-zinc-400">Add</span>
          <Button size="sm" variant="ghost" onClick={() => add(blank.visit)}>
            <Plus className="size-3" /> Profile view
          </Button>
          <Button size="sm" variant="ghost" onClick={() => add(blank.invite)}>
            <Plus className="size-3" /> Connection request
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={messages >= MAX_MESSAGES}
            onClick={() => add(blank.message)}
          >
            <Plus className="size-3" /> {messages === 0 ? 'Message' : 'Follow-up'}
          </Button>
        </div>
      )}
    </div>
  )
}

function DelayInput({
  value,
  after,
  readOnly,
  onChange,
}: {
  value: number
  after: string
  readOnly: boolean
  onChange: (value: number) => void
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="text-zinc-300">·</span>
      wait
      <Input
        type="number"
        min={0}
        step={0.5}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="h-6 w-12 px-1.5 text-center text-xs"
      />
      {value === 1 ? 'day' : 'days'} after {after}
    </span>
  )
}

function TemplateInput({
  value,
  onChange,
  placeholder,
  readOnly,
  max,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  readOnly: boolean
  max?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const insert = (variable: string) => {
    const el = ref.current
    const token = `{{${variable}}}`
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + token + value.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + token.length, start + token.length)
    })
  }
  const length = render(value, SAMPLE_LEAD).length
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        ref={ref}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-20 shadow-none ring-1 ring-zinc-200 focus:ring-accent-500/40"
      />
      {!readOnly && (
        <div className="flex items-center gap-1">
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insert(v)}
              className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 transition-colors hover:bg-accent-50 hover:text-accent-700"
            >
              {`{{${v}}}`}
            </button>
          ))}
          {max && (
            <span
              className={cn(
                'ml-auto text-xs tabular-nums',
                length > max ? 'text-red-600' : 'text-zinc-400',
              )}
            >
              {length}/{max}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function SequencePreview({ steps }: { steps: Step[] }) {
  const name = `${SAMPLE_LEAD.firstName} ${SAMPLE_LEAD.lastName}`
  const invite = steps.find((s) => s.type === 'invite')
  const messages = steps.flatMap((step) => (step.type === 'message' ? [step] : []))
  const labelled = messages.map((step, position) => ({
    step,
    label: position === 0 ? 'First message' : `Follow-up ${position}`,
  }))
  return (
    <div className="rounded-xl bg-white shadow-card">
      <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
        <Avatar name={name} />
        <div>
          <div className="text-[13px] font-medium">{name}</div>
          <div className="text-xs text-zinc-400">
            Preview with a sample lead at {SAMPLE_LEAD.company}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 p-4">
        {invite?.type === 'invite' && (
          <div className="self-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500">
            {invite.note
              ? `Invite note: “${render(invite.note, SAMPLE_LEAD)}”`
              : 'Connection request without a note'}
          </div>
        )}
        {messages.length === 0 && (
          <p className="py-6 text-center text-[13px] text-zinc-400">
            Add a message to see it here.
          </p>
        )}
        {labelled.map(({ step, label }) => (
          <div key={label} className="flex flex-col items-end gap-1 animate-fade-in">
            <span className="text-[11px] text-zinc-400">
              {label}
              {step.delayDays > 0 && ` · after ${step.delayDays}d`}
            </span>
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap text-white">
              {render(step.template, SAMPLE_LEAD) || (
                <span className="opacity-60">Empty message</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
