import type {
  CarpoolRef,
  Driver,
  PlanningRepository,
  PlanningSnapshot,
  WriteOutcome,
} from '../planning/ports'
import { carpoolKey } from '../planning/trips'
import { timetable } from './planningFixtures'

type WriteCall = { kind: 'take' | 'takeOver' | 'cancel'; key: string; currentDriverUid?: string }

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
 * never settles, to observe the button while a write is in flight.
 */
export function planning(
  snapshot: Partial<PlanningSnapshot> = {},
  options: { writeOutcome?: WriteOutcome | 'pending' } = {},
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
      listener({ ...state, carpools: [...state.carpools] })
    }
  }
  const settle = (apply: () => void): Promise<WriteOutcome> => {
    if (options.writeOutcome === 'pending') {
      return new Promise(() => {})
    }
    if (options.writeOutcome !== undefined) {
      return Promise.resolve(options.writeOutcome)
    }
    apply()
    emit()
    return Promise.resolve({ status: 'done' })
  }
  const others = (ref: CarpoolRef) =>
    state.carpools.filter((carpool) => keyOf(carpool) !== keyOf(ref))

  return {
    repository: {
      subscribe(_range, listener) {
        count.subscribes += 1
        listeners.add(listener)
        listener({ ...state, carpools: [...state.carpools] })
        return () => {
          count.unsubscribes += 1
          listeners.delete(listener)
        }
      },
      take(ref: CarpoolRef, driver: Driver) {
        count.writes.push({ kind: 'take', key: keyOf(ref) })
        return settle(() => {
          state.carpools = [
            ...others(ref),
            { ...ref, driverUid: driver.uid, driverName: driver.firstName },
          ]
        })
      },
      takeOver(ref: CarpoolRef, driver: Driver, currentDriverUid: string) {
        count.writes.push({ kind: 'takeOver', key: keyOf(ref), currentDriverUid })
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
      },
      cancel(ref: CarpoolRef) {
        count.writes.push({ kind: 'cancel', key: keyOf(ref) })
        return settle(() => {
          state.carpools = others(ref)
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
