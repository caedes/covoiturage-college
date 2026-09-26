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

export type DaySlot = { start: Time; end: Time }

export type TimetableChild = {
  firstName: string
  gender: Gender
  colorSlot: 1 | 2 | 3
  weeks: Record<WeekType, Record<Weekday, DaySlot>>
}

export type EveningBus = { classEnd: Time; arrival: Time }

/** One version of the `timetables` collection. */
export type Timetable = {
  validFrom: IsoDate
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
  | { kind: 'void'; driverName: string | null }
  | { kind: 'open' }
  | { kind: 'mine' }
  | { kind: 'covered'; driverName: string; replacedYou: boolean }

export type PlannedTrip = Trip & { status: TripStatus }

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

export type DayPlan = {
  date: IsoDate
  weekday: Weekday
  weekType: WeekType
  holiday: boolean
  locked: boolean
  covered: boolean
  aller: PlannedTrip[]
  retour: PlannedTrip[]
  offers: PermanenceOffer[]
}

export type WeekRecap = { covered: number; total: number }

export type WeekPlan = { monday: IsoDate; days: DayPlan[]; recap: WeekRecap }
