import { useCallback, useEffect, useState } from 'react'
import type { DateRange, PlanningSnapshot } from '../../planning/ports'
import { usePlanningContext } from './PlanningContext'

export type PlanningLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: PlanningSnapshot }

/** Subscribes to the displayed window; `retry` subscribes again after a refusal. */
export function usePlanning(range: DateRange): { load: PlanningLoad; retry: () => void } {
  const { repository } = usePlanningContext()
  const [load, setLoad] = useState<PlanningLoad>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is included to trigger re-subscription on retry
  useEffect(() => {
    setLoad({ status: 'loading' })
    return repository.subscribe(
      { from: range.from, to: range.to },
      (snapshot) => setLoad({ status: 'ready', snapshot }),
      () => setLoad({ status: 'error' }),
    )
  }, [repository, range.from, range.to, attempt])

  const retry = useCallback(() => setAttempt((previous) => previous + 1), [])
  return { load, retry }
}
