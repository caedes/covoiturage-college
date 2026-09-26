import type { IsoDate, Weekday, WeekType } from './types'

const PARIS_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_MS = 86_400_000

/** The Monday of a week known to be a "B" week. The alternation runs on from there. */
const REFERENCE_B_MONDAY = '2026-09-21'

/**
 * The project's only definition of "today": the date in Paris as `YYYY-MM-DD` — the `en-CA`
 * locale formats dates in that order.
 */
export function parisToday(now: Date): IsoDate {
  return PARIS_DATE.format(now)
}

/** Midnight UTC of the date: arithmetic in UTC never meets a daylight-saving shift. */
function atUtcMidnight(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(atUtcMidnight(date).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** 0 for Monday … 6 for Sunday. */
export function dayIndex(date: IsoDate): number {
  return (atUtcMidnight(date).getUTCDay() + 6) % 7
}

/** The school day's name, or `null` on a weekend. */
export function weekdayOf(date: IsoDate): Weekday | null {
  return WEEKDAYS[dayIndex(date)] ?? null
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -dayIndex(date))
}

export function schoolDays(monday: IsoDate): IsoDate[] {
  return WEEKDAYS.map((_, index) => addDays(monday, index))
}

export function weekType(date: IsoDate): WeekType {
  const weeks = Math.round(
    (atUtcMidnight(mondayOf(date)).getTime() - atUtcMidnight(REFERENCE_B_MONDAY).getTime()) /
      (7 * DAY_MS),
  )
  return weeks % 2 === 0 ? 'B' : 'A'
}

/** "Cette semaine": the current week, or the coming one on Saturday and Sunday. */
export function displayedMonday(today: IsoDate): IsoDate {
  const monday = mondayOf(today)
  return dayIndex(today) >= 5 ? addDays(monday, 7) : monday
}

/** The day selected when the planning opens: today, or the coming Monday on a weekend. */
export function initialDay(today: IsoDate): IsoDate {
  return dayIndex(today) >= 5 ? displayedMonday(today) : today
}
