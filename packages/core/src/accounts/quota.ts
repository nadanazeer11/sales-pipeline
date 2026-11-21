import { z } from 'zod'

export const limitsSchema = z.object({
  visitsPerDay: z.number().int().nonnegative(),
  invitesPerDay: z.number().int().nonnegative(),
  invitesPerWeek: z.number().int().nonnegative(),
  messagesPerDay: z.number().int().nonnegative(),
})

export type Limits = z.infer<typeof limitsSchema>

export const defaultLimits: Limits = {
  visitsPerDay: 50,
  invitesPerDay: 20,
  invitesPerWeek: 100,
  messagesPerDay: 60,
}

export type Usage = {
  visitsDay: number
  invitesDay: number
  invitesWeek: number
  messagesDay: number
}

export type Remaining = { visit: number; invite: number; message: number }

const WARMUP_DAYS = 21
const WARMUP_FLOOR = 0.3

export function warmupFactor(warmupStartedAt: Date | null, now: Date): number {
  if (!warmupStartedAt) return 1
  const days = (now.getTime() - warmupStartedAt.getTime()) / 86_400_000
  return Math.min(1, WARMUP_FLOOR + ((1 - WARMUP_FLOOR) * Math.max(0, days)) / WARMUP_DAYS)
}

export function remaining(limits: Limits, usage: Usage, factor = 1): Remaining {
  const cap = (n: number) => Math.floor(n * factor)
  return {
    visit: Math.max(0, cap(limits.visitsPerDay) - usage.visitsDay),
    invite: Math.max(
      0,
      Math.min(
        cap(limits.invitesPerDay) - usage.invitesDay,
        cap(limits.invitesPerWeek) - usage.invitesWeek,
      ),
    ),
    message: Math.max(0, cap(limits.messagesPerDay) - usage.messagesDay),
  }
}

export type Schedule = {
  timezone: string
  workStartHour: number
  workEndHour: number
  workDays: number[]
}

export function isWorkingTime(schedule: Schedule, now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timezone,
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value)
  const isoDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1
  return (
    schedule.workDays.includes(isoDay) &&
    hour >= schedule.workStartHour &&
    hour < schedule.workEndHour
  )
}

export function randomGapMs(minMinutes: number, maxMinutes: number, random = Math.random): number {
  const minutes = minMinutes + random() * Math.max(0, maxMinutes - minMinutes)
  return Math.round(minutes * 60_000)
}
