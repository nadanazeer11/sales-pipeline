import { describe, expect, it } from 'vitest'
import {
  defaultLimits,
  isWorkingTime,
  randomGapMs,
  remaining,
  warmupFactor,
} from '../src/accounts/quota'

const zero = { visitsDay: 0, invitesDay: 0, invitesWeek: 0, messagesDay: 0 }

describe('remaining', () => {
  it('returns full limits with no usage', () => {
    expect(remaining(defaultLimits, zero)).toEqual({ visit: 50, invite: 20, message: 60 })
  })

  it('caps invites by the weekly limit', () => {
    expect(remaining(defaultLimits, { ...zero, invitesWeek: 95 }).invite).toBe(5)
  })

  it('never goes negative', () => {
    expect(remaining(defaultLimits, { ...zero, visitsDay: 80 }).visit).toBe(0)
  })

  it('scales by warmup factor', () => {
    expect(remaining(defaultLimits, zero, 0.5).invite).toBe(10)
  })
})

describe('warmupFactor', () => {
  const now = new Date('2026-11-21T12:00:00Z')

  it('is 1 without warmup', () => {
    expect(warmupFactor(null, now)).toBe(1)
  })

  it('starts at the floor and reaches 1 after three weeks', () => {
    expect(warmupFactor(now, now)).toBeCloseTo(0.3)
    expect(warmupFactor(new Date(now.getTime() - 30 * 86_400_000), now)).toBe(1)
  })
})

describe('isWorkingTime', () => {
  const schedule = {
    timezone: 'Africa/Cairo',
    workStartHour: 9,
    workEndHour: 18,
    workDays: [1, 2, 3, 4, 5],
  }

  it('respects timezone and hours', () => {
    expect(isWorkingTime(schedule, new Date('2026-11-23T08:00:00Z'))).toBe(true)
    expect(isWorkingTime(schedule, new Date('2026-11-23T05:00:00Z'))).toBe(false)
  })

  it('skips weekends', () => {
    expect(isWorkingTime(schedule, new Date('2026-11-22T10:00:00Z'))).toBe(false)
  })
})

describe('randomGapMs', () => {
  it('stays within bounds', () => {
    expect(randomGapMs(2, 8, () => 0)).toBe(120_000)
    expect(randomGapMs(2, 8, () => 1)).toBe(480_000)
  })
})
