import { decideCancel, decideTake } from '../planning/actions'
import { childDayKey } from '../planning/childOptions'
import type {
  CarpoolRef,
  Driver,
  PlanningRepository,
  PlanningSnapshot,
  WriteOutcome,
} from '../planning/ports'
import { carpoolKey } from '../planning/trips'
import type { ChildDay } from '../planning/types'
import { timetable } from './planningFixtures'

type WriteCall =
  | { kind: 'take' | 'takeOver' | 'cancel'; key: string; currentDriverUid?: string }
  | { kind: 'saveChildDay'; key: string; childDay: ChildDay; authorUid: string }

export type PlanningScenario = {
  repository: PlanningRepository
  subscribeCalls(): number
  unsubscribeCalls(): number
  writes(): WriteCall[]
}

type Listener = (snapshot: PlanningSnapshot) => void

const FAILED: WriteOutcome = { status: 'failed' }

function keyOf(ref: CarpoolRef): string {
  return carpoolKey(ref.date, ref.direction, ref.place, ref.time)
}

function counters() {
  return { subscribes: 0, unsubscribes: 0, writes: [] as WriteCall[] }
}

/**
 * An in-memory planning. Writes change its carpools and every subscriber receives the new
 * snapshot, as Firestore would. `writeOutcome` forces an outcome without writing; `'pending'`
 * never settles, to observe the button while a write is in flight; `'reject'` rejects the
 * promise, as a write the port itself throws on rather than reports.
 */
export function planning(
  snapshot: Partial<PlanningSnapshot> = {},
  options: { writeOutcome?: WriteOutcome | 'pending' | 'reject' } = {},
): PlanningScenario {
  const state: PlanningSnapshot = {
    timetables: [timetable()],
    carpools: [],
    childDays: [],
    ...snapshot,
  }
  const listeners = new Set<Listener>()
  const count = counters()
  const emit = () => {
    for (const listener of listeners) {
      listener({ ...state, carpools: [...state.carpools], childDays: [...state.childDays] })
    }
  }
  const write = (apply: () => void): Promise<WriteOutcome> => {
    apply()
    emit()
    return Promise.resolve({ status: 'done' })
  }
  const settle = (apply: () => void): Promise<WriteOutcome> => {
    if (options.writeOutcome === 'pending') {
      return new Promise(() => {})
    }
    if (options.writeOutcome === 'reject') {
      return Promise.reject(new Error('Firestore injoignable'))
    }
    if (options.writeOutcome !== undefined) {
      return Promise.resolve(options.writeOutcome)
    }
    return write(apply)
  }
  const others = (ref: CarpoolRef) =>
    state.carpools.filter((carpool) => keyOf(carpool) !== keyOf(ref))
  const existingCarpool = (ref: CarpoolRef) =>
    state.carpools.find((carpool) => keyOf(carpool) === keyOf(ref)) ?? null

  return {
    repository: {
      subscribe(_range, listener) {
        count.subscribes += 1
        listeners.add(listener)
        listener({ ...state, carpools: [...state.carpools], childDays: [...state.childDays] })
        return () => {
          count.unsubscribes += 1
          listeners.delete(listener)
        }
      },
      take(ref: CarpoolRef, driver: Driver) {
        count.writes.push({ kind: 'take', key: keyOf(ref) })
        if (options.writeOutcome !== undefined) {
          return settle(() => {
            state.carpools = [
              ...others(ref),
              { ...ref, driverUid: driver.uid, driverName: driver.firstName },
            ]
          })
        }
        const decision = decideTake(existingCarpool(ref), null, driver.uid)
        if (decision.kind === 'already') {
          return Promise.resolve({ status: 'done' })
        }
        if (decision.kind === 'conflict') {
          return Promise.resolve({ status: 'alreadyTaken', driverName: decision.driverName })
        }
        return write(() => {
          state.carpools = [
            ...others(ref),
            { ...ref, driverUid: driver.uid, driverName: driver.firstName },
          ]
        })
      },
      takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string) {
        count.writes.push({ kind: 'takeOver', key: keyOf(ref), currentDriverUid })
        if (options.writeOutcome !== undefined) {
          return settle(() => {
            state.carpools = [
              ...others(ref),
              {
                ...ref,
                driverUid: driver.uid,
                driverName: driver.firstName,
                replacedDriverUid: currentDriverUid,
              },
            ]
          })
        }
        const decision = decideTake(existingCarpool(ref), currentDriverUid, driver.uid)
        if (decision.kind === 'already') {
          return Promise.resolve({ status: 'done' })
        }
        if (decision.kind === 'conflict') {
          return Promise.resolve({ status: 'alreadyTaken', driverName: decision.driverName })
        }
        return write(() => {
          state.carpools = [
            ...others(ref),
            {
              ...ref,
              driverUid: driver.uid,
              driverName: driver.firstName,
              ...(decision.replacedDriverUid === null
                ? {}
                : { replacedDriverUid: decision.replacedDriverUid }),
            },
          ]
        })
      },
      cancel(ref: CarpoolRef, driver: Driver) {
        count.writes.push({ kind: 'cancel', key: keyOf(ref) })
        if (options.writeOutcome !== undefined) {
          return settle(() => {
            state.carpools = others(ref)
          })
        }
        if (decideCancel(existingCarpool(ref), driver.uid) === 'nothing') {
          return Promise.resolve({ status: 'done' })
        }
        return write(() => {
          state.carpools = others(ref)
        })
      },
      saveChildDay(childDay: ChildDay, authorUid: string) {
        const key = childDayKey(childDay.date, childDay.childId)
        count.writes.push({ kind: 'saveChildDay', key, childDay, authorUid })
        return settle(() => {
          state.childDays = [
            ...state.childDays.filter((day) => childDayKey(day.date, day.childId) !== key),
            childDay,
          ]
        })
      },
    },
    subscribeCalls: () => count.subscribes,
    unsubscribeCalls: () => count.unsubscribes,
    writes: () => count.writes,
  }
}

/** A planning whose reads follow `behave`; any write fails. */
function readOnly(
  behave: (listener: Listener, onError: () => void, attempt: number) => void,
): PlanningScenario {
  const count = counters()
  return {
    repository: {
      subscribe(_range, listener, onError) {
        count.subscribes += 1
        behave(listener, onError, count.subscribes)
        return () => {
          count.unsubscribes += 1
        }
      },
      take: async () => FAILED,
      takeOver: async () => FAILED,
      cancel: async () => FAILED,
      saveChildDay: async () => FAILED,
    },
    subscribeCalls: () => count.subscribes,
    unsubscribeCalls: () => count.unsubscribes,
    writes: () => count.writes,
  }
}

/** Never answers: the page stays on its loading state. */
export function pendingPlanning(): PlanningScenario {
  return readOnly(() => {})
}

/** Reading is refused, as when the Firestore rules are not deployed. */
export function failingPlanning(): PlanningScenario {
  return readOnly((_listener, onError) => onError())
}

/** Refuses the first subscription, then answers with the default snapshot on every retry. */
export function recoveringPlanning(): PlanningScenario {
  return readOnly((listener, onError, attempt) => {
    if (attempt === 1) {
      onError()
      return
    }
    listener({ timetables: [timetable()], carpools: [], childDays: [] })
  })
}
