import { useId } from 'react'
import { actionAccessibleLabel, skipNote, tripDescription } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { ChildId, DayChild, PlannedTrip, TripStatus } from '../../planning/types'
import { ChildAvatar } from '../atoms/ChildAvatar'
import { ChildChip } from '../molecules/ChildChip'
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
  onToggleRider?: (trip: PlannedTrip, childId: ChildId) => void
  pendingKeys?: ReadonlySet<string>
}

export function TripCard({ trip, roster, onAction, onToggleRider, pendingKeys }: TripCardProps) {
  const whoId = useId()
  const nameOf = (childId: string) =>
    roster.find((child) => child.childId === childId)?.firstName ?? childId
  const skippedIds = trip.excluded
    .filter((exclusion) => exclusion.reason === 'skipped')
    .map((exclusion) => exclusion.childId)
  const note = skipNote(skippedIds.map(nameOf))
  /** The viewer's children on this trip, riding or taken off it: the ones they may move. */
  const own = roster.filter(
    (child) =>
      child.editable && (trip.riders.includes(child.childId) || skippedIds.includes(child.childId)),
  )

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
      {own.length === 0 || onToggleRider === undefined ? null : (
        // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would break this inline flex row; role="group" plus aria-labelledby is a valid ARIA group.
        <div role="group" aria-labelledby={whoId} className="flex flex-wrap items-center gap-2">
          <span id={whoId} className="text-sm text-secondary-foreground">
            Qui prend ce trajet ?{' '}
            <span className="sr-only">— {tripDescription(trip.time, trip.label)}</span>
          </span>
          {own.map((child) => {
            const rides = trip.riders.includes(child.childId)
            return (
              <ChildChip
                key={child.childId}
                label={child.firstName}
                colorSlot={child.colorSlot}
                active={rides}
                pressed={rides}
                onClick={() => onToggleRider(trip, child.childId)}
              />
            )
          })}
        </div>
      )}
      <TripStatusBar
        status={trip.status}
        action={
          trip.action === null || onAction === undefined
            ? null
            : {
                kind: trip.action,
                accessibleLabel: actionAccessibleLabel(trip.action, trip.time, trip.label),
                pending: pendingKeys?.has(trip.key) ?? false,
                onClick: () => onAction(trip),
              }
        }
      />
    </div>
  )
}
