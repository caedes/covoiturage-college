import { createContext, useContext } from 'react'
import type { PlanningRepository } from '../../planning/ports'

export type PlanningContextValue = { repository: PlanningRepository; now: () => Date }

/** The planning port and the clock, injected at the root like the auth ports. */
export const PlanningContext = createContext<PlanningContextValue | null>(null)

export function usePlanningContext(): PlanningContextValue {
  const value = useContext(PlanningContext)
  if (value === null) {
    throw new Error("usePlanningContext doit être appelé à l'intérieur d'un PlanningProvider.")
  }
  return value
}
