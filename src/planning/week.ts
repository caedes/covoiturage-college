import { schoolDays, weekdayOf, weekType } from './dates'
import { isHoliday } from './holidays'
import { applyChildDay, defaultLegs, timetableFor } from './legs'
import { resolveStatus } from './status'
import { carpoolKey, describeTrip, groupTrips, permanenceOffers } from './trips'
import type {
  Carpool,
  ChildDay,
  ChildId,
  DayPlan,
  HolidayCalendar,
  IsoDate,
  PlannedTrip,
  Timetable,
  Trip,
  WeekPlan,
  WeekRecap,
} from './types'

export type BuildWeekInput = {
  monday: IsoDate
  today: IsoDate
  timetables: Timetable[]
  carpools: Carpool[]
  childDays: ChildDay[]
  viewerUid: string
  holidays: HolidayCalendar
}

function isCovered(trip: PlannedTrip): boolean {
  return trip.status.kind === 'mine' || trip.status.kind === 'covered'
}

/** A carpool whose children all left keeps a void trip until its driver cancels it. */
function orphanTrip(key: string, carpool: Carpool): Trip {
  return {
    key,
    date: carpool.date,
    direction: carpool.direction,
    place: carpool.place,
    time: carpool.time,
    ...describeTrip(carpool.direction, carpool.place),
    riders: [],
    excluded: [],
  }
}

function orderedChildren(timetable: Timetable): ChildId[] {
  return Object.entries(timetable.children)
    .sort(
      ([leftId, left], [rightId, right]) =>
        left.colorSlot - right.colorSlot || leftId.localeCompare(rightId),
    )
    .map(([id]) => id)
}

function planDay(date: IsoDate, input: BuildWeekInput, carpools: Map<string, Carpool>): DayPlan {
  const weekday = weekdayOf(date) ?? 'mon'
  const empty: DayPlan = {
    date,
    weekday,
    weekType: weekType(date),
    holiday: isHoliday(input.holidays, date),
    locked: date < input.today,
    covered: false,
    aller: [],
    retour: [],
    offers: [],
  }
  const timetable = timetableFor(date, input.timetables)
  if (empty.holiday || timetable === null) {
    return empty
  }

  const childIds = orderedChildren(timetable)
  const days = new Map(
    input.childDays.filter((day) => day.date === date).map((day) => [day.childId, day]),
  )
  const legs = childIds.flatMap((id) =>
    applyChildDay(timetable, date, defaultLegs(timetable, id, date), days.get(id)),
  )
  const trips = groupTrips(date, legs, childIds)
  const known = new Set(trips.map((trip) => trip.key))
  for (const [key, carpool] of carpools) {
    if (carpool.date === date && !known.has(key)) {
      trips.push(orphanTrip(key, carpool))
    }
  }

  const planned = trips
    .map((trip) => ({
      ...trip,
      status: resolveStatus(trip, carpools.get(trip.key), input.viewerUid),
    }))
    .sort(
      (left, right) => left.time.localeCompare(right.time) || left.place.localeCompare(right.place),
    )
  const countable = planned.filter((trip) => trip.status.kind !== 'void')

  return {
    ...empty,
    covered: countable.length > 0 && countable.every(isCovered),
    aller: planned.filter((trip) => trip.direction === 'aller'),
    retour: planned.filter((trip) => trip.direction === 'retour'),
    offers: permanenceOffers(timetable, date, childIds, days),
  }
}

/** "N trajets sur M couverts": void trips and holidays are left out. */
export function weekRecap(days: DayPlan[]): WeekRecap {
  const trips = days
    .filter((day) => !day.holiday)
    .flatMap((day) => [...day.aller, ...day.retour])
    .filter((trip) => trip.status.kind !== 'void')
  return { covered: trips.filter(isCovered).length, total: trips.length }
}

export function buildWeek(input: BuildWeekInput): WeekPlan {
  const carpools = new Map(
    input.carpools.map((carpool) => [
      carpoolKey(carpool.date, carpool.direction, carpool.place, carpool.time),
      carpool,
    ]),
  )
  const days = schoolDays(input.monday).map((date) => planDay(date, input, carpools))
  return { monday: input.monday, days, recap: weekRecap(days) }
}
