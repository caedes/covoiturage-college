import { useId } from 'react'
import type { DayChild, PermanenceOffer, PlannedTrip } from '../../planning/types'
import { PermanenceRow } from './PermanenceRow'
import { TripCard } from './TripCard'

type TripSectionProps = {
  title: string
  trips: PlannedTrip[]
  roster: DayChild[]
  onAction?: (trip: PlannedTrip) => void
  pendingKey?: string | null
}

function byExitTime(offers: PermanenceOffer[]): [string, PermanenceOffer[]][] {
  const groups = new Map<string, PermanenceOffer[]>()
  for (const offer of offers) {
    groups.set(offer.exitTime, [...(groups.get(offer.exitTime) ?? []), offer])
  }
  return [...groups.entries()]
}

export function TripSection({ title, trips, roster, onAction, pendingKey }: TripSectionProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2.5">
      <h2
        id={titleId}
        className="font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {title}
      </h2>
      {trips.length === 0 ? (
        <p className="text-sm text-secondary-foreground">Aucun trajet</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.key} className="flex flex-col gap-2">
              {byExitTime(trip.offers).map(([exitTime, offers]) => (
                <PermanenceRow key={exitTime} exitTime={exitTime} offers={offers} roster={roster} />
              ))}
              <TripCard trip={trip} roster={roster} onAction={onAction} pendingKey={pendingKey} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
