import type { HolidayCalendar, IsoDate } from './types'

/**
 * Zone A (académie de Bordeaux), school year 2026-2027. Periods copied from the official
 * `fr-en-calendrier-scolaire` dataset of data.education.gouv.fr on 2026-09-28; public holidays
 * from the calendar. Public data: it may live in the bundle. Update once a year, with the import.
 */
export const ZONE_A_2026_2027: HolidayCalendar = {
  periods: [
    { from: '2026-10-17', until: '2026-11-02' },
    { from: '2026-12-19', until: '2027-01-04' },
    { from: '2027-02-13', until: '2027-03-01' },
    { from: '2027-04-10', until: '2027-04-26' },
    { from: '2027-05-07', until: '2027-05-08' },
    { from: '2027-07-03', until: '2027-09-02' },
  ],
  publicHolidays: [
    '2026-11-11',
    '2026-12-25',
    '2027-01-01',
    '2027-03-29',
    '2027-05-01',
    '2027-05-06',
    '2027-05-08',
    '2027-05-17',
    '2027-07-14',
    '2027-08-15',
  ],
}

export function isHoliday(calendar: HolidayCalendar, date: IsoDate): boolean {
  return (
    calendar.publicHolidays.includes(date) ||
    calendar.periods.some((period) => period.from <= date && date < period.until)
  )
}
