import type { Carpool, ChildDay, Direction, IsoDate, Place, Time, Timetable } from './types'

export type DateRange = { from: IsoDate; to: IsoDate }

/** Identifies a carpool the way its document id does. */
export type CarpoolRef = { date: IsoDate; direction: Direction; place: Place; time: Time }

/** Who writes: the session's uid and the first name of their `members` document. */
export type Driver = { uid: string; firstName: string }

export type WriteOutcome =
  | { status: 'done' }
  | { status: 'alreadyTaken'; driverName: string }
  | { status: 'failed' }

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
  /** « Je prends ». */
  take(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>
  /** « Je le prends », from the driver the viewer saw on screen. */
  takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string): Promise<WriteOutcome>
  /** « Annuler ». */
  cancel(ref: CarpoolRef, driver: Driver): Promise<WriteOutcome>
}
