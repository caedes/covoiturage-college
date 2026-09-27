import { actionAccessibleLabel, skipNote } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { DayChild, PlannedTrip, TripStatus } from '../../planning/types'
import { ChildAvatar } from '../atoms/ChildAvatar'
import { TripStatusBar } from '../molecules/TripStatusBar'

const CARD: Record<TripStatus['kind'], string> = {
  void: 'border-dashed border-foreground/20 bg-muted',
  open: 'border-border bg-card shadow-sm',
  covered: 'border-border bg-card shadow-sm',
  mine: 'border-primary bg-card shadow-sm',
}

type TripCardProps = {
  trip: PlannedTrip
  roster: DayChild[]
  onAction?: (trip: PlannedTrip) => void
  pendingKey?: string | null
}

export function TripCard({ trip, roster, onAction, pendingKey }: TripCardProps) {
  const nameOf = (childId: string) =>
    roster.find((child) => child.childId === childId)?.firstName ?? childId
  const skipped = trip.excluded
    .filter((exclusion) => exclusion.reason === 'skipped')
    .map((exclusion) => nameOf(exclusion.childId))
  const note = skipNote(skipped)

  return (
    <div className={cn('flex flex-col gap-3 rounded-3xl border p-4', CARD[trip.status.kind])}>
      <div className="flex items-start gap-3">
        <span className="w-14 shrink-0 font-heading text-3xl font-semibold leading-none">
          {trip.time}
        </span>
        <span className="min-w-0 flex-1 font-medium leading-tight">{trip.label}</span>
        <span className="flex shrink-0 gap-1">
          {trip.riders.map((childId) => (
            <ChildAvatar
              key={childId}
              name={nameOf(childId)}
              colorSlot={roster.find((child) => child.childId === childId)?.colorSlot ?? 1}
            />
          ))}
        </span>
      </div>
      {note === '' ? null : <p className="text-sm text-secondary-foreground">{note}</p>}
      <TripStatusBar
        status={trip.status}
        action={
          trip.action === null || onAction === undefined
            ? null
            : {
                kind: trip.action,
                accessibleLabel: actionAccessibleLabel(trip.action, trip.time, trip.label),
                pending: pendingKey === trip.key,
                onClick: () => onAction(trip),
              }
        }
      />
    </div>
  )
}
