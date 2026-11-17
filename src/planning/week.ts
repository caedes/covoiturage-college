import { tripAction } from './actions'
import { schoolDays, weekdayOf, weekType } from './dates'
import { isHoliday } from './holidays'
import { applyChildDay, defaultLegs, retourPlacement, scheduledSlot, timetableFor } from './legs'
import { resolveStatus } from './status'
import { carpoolKey, describeTrip, groupTrips, permanenceOffers } from './trips'
import type {
  Carpool,
  ChildDay,
  ChildId,
  DayHours,
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
  viewerCanDrive: boolean
  viewerChildIds: ChildId[]
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

/**
 * A child's hours for the day with the car trips they call for, or `null` without bell times or
 * lessons. A later start moves the aller; an earlier exit moves the retour only when it differs
 * from where the usual exit already leads (bus, or Wednesday's 13:15).
 */
function dayHours(
  timetable: Timetable,
  childId: ChildId,
  date: IsoDate,
  childDay: ChildDay | undefined,
): DayHours | null {
  const bellTimes = timetable.bellTimes
  const slot = scheduledSlot(timetable, childId, date, childDay)
  if (bellTimes === undefined || slot === null) {
    return null
  }
  const { usual, start, end } = slot
  const retour = retourPlacement(timetable, date, end)
  const usualRetour = retourPlacement(timetable, date, usual.end)
  const retourCalled =
    end !== usual.end && retour.place === 'college' && retour.time !== usualRetour.time
  return {
    usual,
    start,
    end,
    bellTimes,
    effect: {
      aller: start > usual.start ? start : null,
      retour: retourCalled ? retour.time : null,
    },
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

/**
 * Plans one school day. A day counts as covered once every trip with riders has a driver — so a
 * day where nobody needs a ride, everyone being absent, has nothing left to organise and is covered.
 */
function planDay(date: IsoDate, input: BuildWeekInput, carpools: Map<string, Carpool>): DayPlan {
  const weekday = weekdayOf(date) ?? 'mon'
  const empty: DayPlan = {
    date,
    weekday,
    weekType: weekType(date),
    holiday: isHoliday(input.holidays, date),
    locked: date < input.today,
    covered: false,
    children: [],
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
    .map((trip) => {
      const status = resolveStatus(trip, carpools.get(trip.key), input.viewerUid)
      return {
        ...trip,
        status,
        offers: offers.filter((offer) => offer.tripKey === trip.key),
        action: tripAction(status, input.viewerCanDrive && date >= input.today),
      }
    })
    .sort(
      (left, right) => left.time.localeCompare(right.time) || left.place.localeCompare(right.place),
    )
  const countable = planned.filter((trip) => trip.status.kind !== 'void')

  return {
    ...empty,
    children: childIds.flatMap((childId) => {
      const child = timetable.children[childId]
      const hours = dayHours(timetable, childId, date, days.get(childId))
      return child === undefined
        ? []
        : [
            {
              childId,
              firstName: child.firstName,
              gender: child.gender,
              colorSlot: child.colorSlot,
              presence: days.get(childId)?.presence ?? 'present',
              ...(hours === null ? {} : { hours }),
              editable: !empty.locked && input.viewerChildIds.includes(childId),
            },
          ]
    }),
    covered: planned.length > 0 && countable.every(isCovered),
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
