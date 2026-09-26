import type { PlanningRepository, PlanningSnapshot } from '../planning/ports'
import { timetable } from './planningFixtures'

export type PlanningScenario = {
  repository: PlanningRepository
  subscribeCalls(): number
  unsubscribeCalls(): number
}

function scenario(
  behave: (
    listener: (snapshot: PlanningSnapshot) => void,
    onError: () => void,
    attempt: number,
  ) => void,
): PlanningScenario {
  let calls = 0
  let unsubscribes = 0
  return {
    repository: {
      subscribe(_range, listener, onError) {
        calls += 1
        behave(listener, onError, calls)
        return () => {
          unsubscribes += 1
        }
      },
    },
    subscribeCalls() {
      return calls
    },
    unsubscribeCalls() {
      return unsubscribes
    },
  }
}

/** Answers at once with the fictitious timetable, plus whatever the test adds. */
export function planning(snapshot: Partial<PlanningSnapshot> = {}): PlanningScenario {
  return scenario((listener) =>
    listener({ timetables: [timetable()], carpools: [], childDays: [], ...snapshot }),
  )
}

/** Never answers: the page stays on its loading state. */
export function pendingPlanning(): PlanningScenario {
  return scenario(() => {})
}

/** Reading is refused, as when the Firestore rules are not deployed. */
export function failingPlanning(): PlanningScenario {
  return scenario((_listener, onError) => onError())
}

/** Refuses the first subscription, then answers with the default snapshot on every retry. */
export function recoveringPlanning(): PlanningScenario {
  return scenario((listener, onError, attempt) => {
    if (attempt === 1) {
      onError()
      return
    }
    listener({ timetables: [timetable()], carpools: [], childDays: [] })
  })
}
