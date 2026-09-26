import type { Carpool, ChildDay, IsoDate, Timetable } from './types'

export type DateRange = { from: IsoDate; to: IsoDate }

export type PlanningSnapshot = {
  timetables: Timetable[]
  carpools: Carpool[]
  childDays: ChildDay[]
}

/**
 * The planning as the app reads it. One subscription covers the displayed window: the listener
 * receives the whole snapshot again on every change, and `onError` when reading is refused.
 */
export type PlanningRepository = {
  subscribe(
    range: DateRange,
    listener: (snapshot: PlanningSnapshot) => void,
    onError: () => void,
  ): () => void
}
