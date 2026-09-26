import { weekdayOf } from './dates'
import { effectiveExit, retourPlacement } from './legs'
import type {
  ChildDay,
  ChildId,
  Direction,
  IsoDate,
  Leg,
  Mode,
  PermanenceOffer,
  Place,
  Time,
  Timetable,
  Trip,
} from './types'

/** The id of the `carpools` document that covers this trip. */
export function carpoolKey(date: IsoDate, direction: Direction, place: Place, time: Time): string {
  return `${date}_${direction}_${place}_${time.replace(':', '')}`
}

export function describeTrip(direction: Direction, place: Place): { label: string; mode: Mode } {
  if (direction === 'aller') {
    return place === 'centre-bourg'
      ? { label: 'Maison → Centre-bourg', mode: 'bus' }
      : { label: 'Maison → Collège', mode: 'car' }
  }
  return place === 'centre-bourg'
    ? { label: 'Centre-bourg → Maison', mode: 'bus' }
    : { label: 'Collège → Maison', mode: 'car' }
}

/** Children sharing a direction, a place and a time share one trip — hence one driver. */
export function groupTrips(date: IsoDate, legs: Leg[], order: ChildId[]): Trip[] {
  const trips = new Map<string, Trip>()
  const rank = (childId: ChildId) => order.indexOf(childId)
  const sorted = [...legs].sort((left, right) => rank(left.childId) - rank(right.childId))

  for (const leg of sorted) {
    const key = carpoolKey(date, leg.direction, leg.place, leg.time)
    const trip = trips.get(key) ?? {
      key,
      date,
      direction: leg.direction,
      place: leg.place,
      time: leg.time,
      ...describeTrip(leg.direction, leg.place),
      riders: [],
      excluded: [],
    }
    if (leg.exclusion === null) {
      trip.riders.push(leg.childId)
    } else {
      trip.excluded.push({ childId: leg.childId, reason: leg.exclusion })
    }
    trips.set(key, trip)
  }

  return [...trips.values()].sort(
    (left, right) =>
      (left.direction === right.direction ? 0 : left.direction === 'aller' ? -1 : 1) ||
      left.time.localeCompare(right.time) ||
      left.place.localeCompare(right.place),
  )
}

function ridesRetour(childDay: ChildDay | undefined): boolean {
  return (
    (childDay?.presence ?? 'present') === 'present' && !(childDay?.skipped ?? []).includes('retour')
  )
}

/**
 * "Permanence HH:MM" offers: a child riding home may stay at school until a later exit — another
 * riding child's actual exit, or an evening bus — and join that trip. Never on Wednesdays, when
 * everyone leaves together.
 */
export function permanenceOffers(
  timetable: Timetable,
  date: IsoDate,
  childIds: ChildId[],
  childDays: Map<ChildId, ChildDay>,
): PermanenceOffer[] {
  if (weekdayOf(date) === null || weekdayOf(date) === 'wed') {
    return []
  }
  const offers: PermanenceOffer[] = []

  for (const childId of childIds) {
    const own = childDays.get(childId)
    const end = effectiveExit(timetable, childId, date, undefined)
    if (end === null || !ridesRetour(own)) {
      continue
    }

    const exits = new Set<Time>(timetable.eveningBuses.map((bus) => bus.classEnd))
    for (const otherId of childIds) {
      const other = childDays.get(otherId)
      const exit = effectiveExit(timetable, otherId, date, other)
      if (otherId !== childId && exit !== null && ridesRetour(other)) {
        exits.add(exit)
      }
    }
    const chosen = effectiveExit(timetable, childId, date, own)
    if (chosen !== null && chosen !== end) {
      exits.add(chosen)
    }

    for (const exitTime of [...exits].filter((exit) => exit > end).sort()) {
      const { place, time } = retourPlacement(timetable, date, exitTime)
      offers.push({
        childId,
        exitTime,
        tripKey: carpoolKey(date, 'retour', place, time),
        active: chosen === exitTime && chosen !== end,
      })
    }
  }
  return offers
}
