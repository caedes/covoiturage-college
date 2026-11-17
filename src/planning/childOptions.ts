import type {
  ChildDay,
  ChildId,
  DaySlot,
  Direction,
  HoursChange,
  IsoDate,
  Presence,
  Time,
} from './types'

const DIRECTIONS: Direction[] = ['aller', 'retour']

/** The id of the `childDays` document for this child on this day. */
export function childDayKey(date: IsoDate, childId: ChildId): string {
  return `${date}_${childId}`
}

/** The day's options as they stand; an absent document means present, nothing changed. */
function startingFrom(day: ChildDay | undefined, date: IsoDate, childId: ChildId): ChildDay {
  return day ?? { date, childId, presence: 'present', skipped: [] }
}

/** The modified hours of the day, as fields to spread: absent hours add no key (never `undefined`). */
function hoursOf(day: ChildDay): Pick<ChildDay, 'start' | 'end'> {
  return {
    ...(day.start !== undefined && { start: day.start }),
    ...(day.end !== undefined && { end: day.end }),
  }
}

/**
 * Changing a child's presence clears the rest of their day: « covoiturage normal » means every
 * default trip and no permanence, and neither means anything to a child who is absent or makes
 * their own way.
 */
export function withPresence(date: IsoDate, childId: ChildId, presence: Presence): ChildDay {
  return { date, childId, presence, skipped: [] }
}

/**
 * « Qui prend ce trajet ? »: takes the child off one direction, or puts them back. Taken off the
 * retour, the child loses their permanence too: they have another way home, or someone outside
 * the carpool collects them. Put back, they ride from the end of classes.
 */
export function toggleSkipped(
  day: ChildDay | undefined,
  date: IsoDate,
  childId: ChildId,
  direction: Direction,
): ChildDay {
  const current = startingFrom(day, date, childId)
  const skipping = !current.skipped.includes(direction)
  const skipped = skipping
    ? [...current.skipped, direction]
    : current.skipped.filter((candidate) => candidate !== direction)
  const next: ChildDay = {
    date: current.date,
    childId: current.childId,
    presence: current.presence,
    skipped: DIRECTIONS.filter((candidate) => skipped.includes(candidate)),
    ...hoursOf(current),
  }
  if (current.permanence === undefined || (skipping && direction === 'retour')) {
    return next
  }
  return { ...next, permanence: current.permanence }
}

/**
 * « Permanence HH:MM »: the child stays at school until that exit. Choosing the active one again
 * goes back to the end of classes — by leaving the field out, as Firestore rejects `undefined`.
 */
export function togglePermanence(
  day: ChildDay | undefined,
  date: IsoDate,
  childId: ChildId,
  exitTime: Time,
): ChildDay {
  const current = startingFrom(day, date, childId)
  if (current.permanence === exitTime) {
    return {
      date: current.date,
      childId: current.childId,
      presence: current.presence,
      skipped: current.skipped,
      ...hoursOf(current),
    }
  }
  return { ...current, permanence: exitTime }
}

/**
 * « Horaires modifiés »: sets the child's start or end of day, present from then on. An hour equal
 * to the usual one is left out. A new end drops the permanence, which was chosen against the old
 * one. If start would no longer come before end, the other hour goes back to usual; if even the
 * usual one does not fit, the hour is not stored at all, as the planning would ignore it.
 */
export function withHours(
  day: ChildDay | undefined,
  date: IsoDate,
  childId: ChildId,
  change: HoursChange,
  usual: DaySlot,
): ChildDay {
  const current = startingFrom(day, date, childId)
  let start = current.start
  let end = current.end
  if ('start' in change) start = change.start === usual.start ? undefined : change.start
  else end = change.end === usual.end ? undefined : change.end
  if ((start ?? usual.start) >= (end ?? usual.end)) {
    if ('start' in change) end = undefined
    else start = undefined
  }
  if ((start ?? usual.start) >= (end ?? usual.end)) {
    return { ...current, presence: 'present' }
  }
  const keepPermanence = 'start' in change && current.permanence !== undefined
  return {
    date: current.date,
    childId: current.childId,
    presence: 'present',
    skipped: current.skipped,
    ...(keepPermanence && { permanence: current.permanence }),
    ...(start !== undefined && { start }),
    ...(end !== undefined && { end }),
  }
}
