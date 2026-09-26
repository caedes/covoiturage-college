import { type ReactNode, useMemo } from 'react'
import type { PlanningRepository } from '../../planning/ports'
import { PlanningContext } from './PlanningContext'

type PlanningProviderProps = {
  repository: PlanningRepository
  now: () => Date
  children: ReactNode
}

export function PlanningProvider({ repository, now, children }: PlanningProviderProps) {
  const value = useMemo(() => ({ repository, now }), [repository, now])
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}
