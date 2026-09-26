import { weekdayOf, weekType } from './dates'
import type { ChildDay, ChildId, DaySlot, IsoDate, Leg, Place, Time, Timetable } from './types'

const ALLER_TIME = '07:40'
/** On Wednesdays the children lunch at school: everyone is collected at 13:15. */
const WEDNESDAY_RETOUR_TIME = '13:15'
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** The version in force on `date`: the latest `validFrom` not after it. */
export function timetableFor(date: IsoDate, timetables: Timetable[]): Timetable | null {
  let current: Timetable | null = null
  for (const candidate of timetables) {
    if (
      candidate.validFrom <= date &&
      (current === null || candidate.validFrom > current.validFrom)
    ) {
      current = candidate
    }
  }
  return current
}

function slotOf(timetable: Timetable, childId: ChildId, date: IsoDate): DaySlot | null {
  const weekday = weekdayOf(date)
  if (weekday === null) {
    return null
  }
  return timetable.children[childId]?.weeks[weekType(date)][weekday] ?? null
}

/** Where and when a child leaving school at `exit` is collected. */
export function retourPlacement(
  timetable: Timetable,
  date: IsoDate,
  exit: Time,
): { place: Place; time: Time } {
  if (weekdayOf(date) === 'wed') {
    return { place: 'college', time: WEDNESDAY_RETOUR_TIME }
  }
  const bus = timetable.eveningBuses.find((candidate) => candidate.classEnd === exit)
  return bus === undefined
    ? { place: 'college', time: exit }
    : { place: 'centre-bourg', time: bus.arrival }
}

/**
 * A permanence only counts when it is well formed, later than the end of classes, and not on a
 * Wednesday. Anything else — written by a faulty client — is ignored rather than trusted.
 */
function validPermanence(
  date: IsoDate,
  end: Time,
  permanence: Time | undefined,
): permanence is Time {
  return (
    permanence !== undefined &&
    TIME.test(permanence) &&
    permanence > end &&
    weekdayOf(date) !== 'wed'
  )
}

/** When the child actually leaves school: the permanence when valid, else the end of classes. */
export function effectiveExit(
  timetable: Timetable,
  childId: ChildId,
  date: IsoDate,
  childDay: ChildDay | undefined,
): Time | null {
  const slot = slotOf(timetable, childId, date)
  if (slot === null) {
    return null
  }
  const permanence = childDay?.permanence
  return validPermanence(date, slot.end, permanence) ? permanence : slot.end
}

export function defaultLegs(timetable: Timetable, childId: ChildId, date: IsoDate): Leg[] {
  const slot = slotOf(timetable, childId, date)
  if (slot === null) {
    return []
  }
  return [
    { childId, direction: 'aller', place: 'centre-bourg', time: ALLER_TIME, exclusion: null },
    {
      childId,
      direction: 'retour',
      ...retourPlacement(timetable, date, slot.end),
      exclusion: null,
    },
  ]
}

/**
 * Applies the day's options. An excluded child keeps their legs, marked with the reason: the trip
 * still shows who is missing, and a trip left without riders stays visible as void.
 */
export function applyChildDay(
  timetable: Timetable,
  date: IsoDate,
  legs: Leg[],
  childDay: ChildDay | undefined,
): Leg[] {
  if (childDay === undefined) {
    return legs
  }
  const exit = effectiveExit(timetable, childDay.childId, date, childDay)
  return legs.map((leg) => {
    if (childDay.presence !== 'present') {
      return { ...leg, exclusion: childDay.presence }
    }
    const placed =
      leg.direction === 'retour' && exit !== null
        ? { ...leg, ...retourPlacement(timetable, date, exit) }
        : leg
    return childDay.skipped.includes(leg.direction) ? { ...placed, exclusion: 'skipped' } : placed
  })
}
