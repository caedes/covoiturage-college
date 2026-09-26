import { schoolDays, weekdayOf, weekType } from './dates'
import { isHoliday } from './holidays'
import { applyChildDay, defaultLegs, retourPlacement, timetableFor } from './legs'
import { resolveStatus } from './status'
import { carpoolKey, describeTrip, groupTrips, permanenceOffers } from './trips'
import type {
  Carpool,
  ChildDay,
  ChildId,
  DayPlan,
  Direction,
  HolidayCalendar,
  IsoDate,
  Place,
  PlannedTrip,
  Time,
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

/**
 * A trip nobody rides: a carpool whose children all left, kept until its driver cancels it, or
 * the target of a permanence offer that no child has taken up yet.
 */
function emptyTrip(
  key: string,
  date: IsoDate,
  direction: Direction,
  place: Place,
  time: Time,
): Trip {
  return {
    key,
    date,
    direction,
    place,
    time,
    ...describeTrip(direction, place),
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
      trips.push(emptyTrip(key, date, carpool.direction, carpool.place, carpool.time))
      known.add(key)
    }
  }
  const offers = permanenceOffers(timetable, date, childIds, days)
  for (const offer of offers) {
    if (!known.has(offer.tripKey)) {
      const { place, time } = retourPlacement(timetable, date, offer.exitTime)
      trips.push(emptyTrip(offer.tripKey, date, 'retour', place, time))
      known.add(offer.tripKey)
    }
  }

  const planned = trips
    .map((trip) => ({
      ...trip,
      status: resolveStatus(trip, carpools.get(trip.key), input.viewerUid),
      offers: offers.filter((offer) => offer.tripKey === trip.key),
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
