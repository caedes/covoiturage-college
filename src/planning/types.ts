/** `YYYY-MM-DD`. Dates are compared as strings. */
export type IsoDate = string
/** `HH:MM`, 24-hour clock. */
export type Time = string
export type ChildId = string

export type Direction = 'aller' | 'retour'
export type Place = 'centre-bourg' | 'college'
export type Mode = 'bus' | 'car'
export type Gender = 'female' | 'male'
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'
export type WeekType = 'A' | 'B'

export type ColorSlot = 1 | 2 | 3

export type DaySlot = { start: Time; end: Time }

export type TimetableChild = {
  firstName: string
  gender: Gender
  colorSlot: ColorSlot
  weeks: Record<WeekType, Record<Weekday, DaySlot>>
}

export type EveningBus = { classEnd: Time; arrival: Time }

/** The school's bell times: the lesson start times and the lesson end times of the day. */
export type BellTimes = { starts: Time[]; ends: Time[] }

/** One version of the `timetables` collection. */
export type Timetable = {
  validFrom: IsoDate
  bellTimes?: BellTimes
  eveningBuses: EveningBus[]
  children: Record<ChildId, TimetableChild>
}

/** A `carpools` document: someone drives this trip. */
export type Carpool = {
  date: IsoDate
  direction: Direction
  place: Place
  time: Time
  driverUid: string
  driverName: string
  replacedDriverUid?: string
}

export type Presence = 'present' | 'absent' | 'sansCovoiturage'

/** A `childDays` document: the day's options set by a parent. Absent document = present. */
export type ChildDay = {
  date: IsoDate
  childId: ChildId
  presence: Presence
  permanence?: Time
  /** Modified start of the day. */
  start?: Time
  /** Modified end of the day. */
  end?: Time
  skipped: Direction[]
}

export type ExclusionReason = 'skipped' | 'absent' | 'sansCovoiturage'

/** One child's journey in one direction, before grouping. */
export type Leg = {
  childId: ChildId
  direction: Direction
  place: Place
  time: Time
  exclusion: ExclusionReason | null
}

export type Trip = {
  key: string
  date: IsoDate
  direction: Direction
  place: Place
  mode: Mode
  time: Time
  label: string
  riders: ChildId[]
  excluded: { childId: ChildId; reason: ExclusionReason }[]
}

export type TripStatus =
  /** No rider. A leftover carpool keeps its driver, who alone may cancel it: hence `mine`. */
  | { kind: 'void'; driverName: string | null; mine: boolean }
  | { kind: 'open' }
  | { kind: 'mine' }
  | { kind: 'covered'; driverName: string; driverUid: string; replacedYou: boolean }

/** What the viewer may do on a trip: « Je prends », « Je le prends », « Annuler ». */
export type TripAction = 'take' | 'takeOver' | 'cancel'

/** A trip as displayed: its status, and the "Permanence HH:MM" offers that would join it. */
export type PlannedTrip = Trip & {
  status: TripStatus
  offers: PermanenceOffer[]
  action: TripAction | null
}

/** "Permanence HH:MM": the child could stay at school until `exitTime` and join `tripKey`. */
export type PermanenceOffer = {
  childId: ChildId
  exitTime: Time
  tripKey: string
  active: boolean
}

/** School holidays as `[from, until)` periods, `until` being the day classes resume. */
export type HolidayCalendar = {
  periods: { from: IsoDate; until: IsoDate }[]
  publicHolidays: IsoDate[]
}

/** A change of the child's hours for the day: a modified start or end. */
export type HoursChange = { start: Time } | { end: Time }

/** A child's hours for a day, usual and effective. */
export type DayHours = {
  /** The child's usual slot for this day. */
  usual: DaySlot
  /** Effective start of the day. */
  start: Time
  /** Effective end of the day. */
  end: Time
  bellTimes: BellTimes
  /** Times of the car trips the change creates, `null` when it creates none. */
  effect: { aller: Time | null; retour: Time | null }
}

/** A child as the day shows them: who they are, and whether they ride today. */
export type DayChild = {
  childId: ChildId
  firstName: string
  gender: Gender
  colorSlot: ColorSlot
  presence: Presence
  /** Absent without `bellTimes` or when the child has no lesson that day. */
  hours?: DayHours
  /** The viewer is one of this child's parents, and the day is not locked. */
  editable: boolean
}

export type DayPlan = {
  date: IsoDate
  weekday: Weekday
  weekType: WeekType
  holiday: boolean
  locked: boolean
  covered: boolean
  children: DayChild[]
  aller: PlannedTrip[]
  retour: PlannedTrip[]
}

export type WeekRecap = { covered: number; total: number }

export type WeekPlan = { monday: IsoDate; days: DayPlan[]; recap: WeekRecap }
