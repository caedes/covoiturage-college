import { Check, CircleX, Clock, User } from 'lucide-react'
import type { TripStatus } from '../../planning/types'

const ICONS = { void: CircleX, open: Clock, mine: User, covered: Check } as const

/** Decorative: the status is always spelled out next to it. */
export function StatusIcon({ kind }: { kind: TripStatus['kind'] }) {
  const Icon = ICONS[kind]
  return <Icon aria-hidden="true" className="size-3.5 shrink-0" />
}
