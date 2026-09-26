import type { Carpool, ChildDay, DaySlot, Timetable, Weekday } from '../planning/types'

type WeekSpec = Record<Weekday, [string, string]>

function week(spec: WeekSpec): Record<Weekday, DaySlot> {
  return Object.fromEntries(
    Object.entries(spec).map(([day, [start, end]]) => [day, { start, end }]),
  ) as Record<Weekday, DaySlot>
}

const ALICE_A: WeekSpec = {
  mon: ['08:25', '16:00'],
  tue: ['08:25', '17:00'],
  wed: ['08:25', '11:30'],
  thu: ['08:25', '14:55'],
  fri: ['08:25', '17:00'],
}

const BASILE: WeekSpec = {
  mon: ['08:25', '17:00'],
  tue: ['09:25', '17:00'],
  wed: ['08:25', '12:30'],
  thu: ['08:25', '17:00'],
  fri: ['08:25', '16:00'],
}

const CHLOE: WeekSpec = {
  mon: ['08:25', '16:00'],
  tue: ['08:25', '16:00'],
  wed: ['09:25', '12:30'],
  thu: ['08:25', '16:00'],
  fri: ['08:25', '17:00'],
}

/** A fictitious timetable: one evening bus (17:00 → 17:45); only Alice's Monday differs in B. */
export function timetable(overrides: Partial<Timetable> = {}): Timetable {
  return {
    validFrom: '2026-09-01',
    eveningBuses: [{ classEnd: '17:00', arrival: '17:45' }],
    children: {
      alice: {
        firstName: 'Alice',
        gender: 'female',
        colorSlot: 1,
        weeks: { A: week(ALICE_A), B: week({ ...ALICE_A, mon: ['08:25', '17:00'] }) },
      },
      basile: {
        firstName: 'Basile',
        gender: 'male',
        colorSlot: 2,
        weeks: { A: week(BASILE), B: week(BASILE) },
      },
      chloe: {
        firstName: 'Chloé',
        gender: 'female',
        colorSlot: 3,
        weeks: { A: week(CHLOE), B: week(CHLOE) },
      },
    },
    ...overrides,
  }
}

export const VIEWER = 'uid-lea'

export function carpool(
  fields: Pick<Carpool, 'date' | 'direction' | 'place' | 'time'> & Partial<Carpool>,
): Carpool {
  return { driverUid: 'uid-paul', driverName: 'Paul', ...fields }
}

export function childDay(fields: Pick<ChildDay, 'date' | 'childId'> & Partial<ChildDay>): ChildDay {
  return { presence: 'present', skipped: [], ...fields }
}
