import { describe, expect, it } from 'vitest'
import { advance, render, type Step, stepLabel, stepsSchema } from '../src/campaigns/steps'

const steps: Step[] = [
  { type: 'visit' },
  { type: 'invite', timeoutDays: 21 },
  { type: 'message', delayDays: 2, template: 'Hi {{firstName}}' },
]
const now = new Date('2026-11-21T12:00:00Z')

describe('render', () => {
  it('fills variables and drops missing ones', () => {
    expect(render('Hi {{ firstName }} at {{company}}!', { firstName: 'Jane' })).toBe('Hi Jane at !')
  })

  it('collapses double spaces from empty variables', () => {
    expect(render('Hi {{firstName}} there', {})).toBe('Hi there')
  })
})

describe('advance', () => {
  it('moves to the next step immediately when it has no delay', () => {
    expect(advance(steps, 0, now)).toMatchObject({
      stepIndex: 1,
      state: 'active',
      nextActionAt: now,
    })
  })

  it('applies the next message delay', () => {
    expect(advance(steps, 1, now).nextActionAt).toEqual(new Date('2026-11-23T12:00:00Z'))
  })

  it('completes after the last step', () => {
    expect(advance(steps, 2, now).state).toBe('completed')
  })
})

describe('stepsSchema', () => {
  it('applies defaults and rejects long notes', () => {
    expect(stepsSchema.parse([{ type: 'invite' }])).toEqual([{ type: 'invite', timeoutDays: 21 }])
    expect(() => stepsSchema.parse([{ type: 'invite', note: 'x'.repeat(301) }])).toThrow()
  })
})

describe('campaign limits', () => {
  const message = (template: string) => ({ type: 'message', template })

  it('allows at most 5 message steps (1 opener + 4 follow-ups)', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map(message)
    expect(() => stepsSchema.parse(five)).not.toThrow()
    expect(() => stepsSchema.parse([...five, message('f')])).toThrow(/at most 5/)
  })

  it('rejects duplicate message templates', () => {
    expect(() =>
      stepsSchema.parse([message('Hi {{firstName}}'), message('Hi {{firstName}}')]),
    ).toThrow(/distinct/)
  })
})

describe('stepLabel', () => {
  it('names steps by role and numbers follow-ups', () => {
    const sequence: Step[] = [
      { type: 'visit' },
      { type: 'invite', timeoutDays: 21 },
      { type: 'message', delayDays: 1, template: 'a' },
      { type: 'message', delayDays: 2, template: 'b' },
    ]
    expect([0, 1, 2, 3, 4].map((i) => stepLabel(sequence, i))).toEqual([
      'Visit profile',
      'Connect',
      'Message',
      'Follow-up 1',
      'Done',
    ])
  })
})
