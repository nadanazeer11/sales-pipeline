import { describe, expect, it } from 'vitest'
import type { Step } from '../src/campaigns/steps'
import { stepDescription } from '../src/leads/views'

const steps: Step[] = [
  { type: 'visit' },
  { type: 'invite', timeoutDays: 21 },
  { type: 'message', delayDays: 1, template: 'a' },
  { type: 'message', delayDays: 2, template: 'b' },
]
const lead = { invitedAt: null, connectedAt: null }
const at = new Date()

describe('stepDescription', () => {
  it('describes the next step for active leads', () => {
    expect(stepDescription({ ...lead, state: 'active', stepIndex: 2 }, steps)).toBe('Next: message')
  })

  it('names the invite when a lead is stopped while waiting to be accepted', () => {
    expect(stepDescription({ ...lead, invitedAt: at, state: 'stopped', stepIndex: 1 }, steps)).toBe(
      'Stopped after connect',
    )
  })

  it('names the last step taken when a lead replied', () => {
    expect(
      stepDescription({ invitedAt: at, connectedAt: at, state: 'replied', stepIndex: 3 }, steps),
    ).toBe('Replied after message')
  })

  it('covers terminal states', () => {
    expect(stepDescription({ ...lead, state: 'completed', stepIndex: 4 }, steps)).toBe(
      'Sequence finished',
    )
    expect(stepDescription({ ...lead, state: 'expired', stepIndex: 1 }, steps)).toBe(
      'Invite not accepted',
    )
  })
})
