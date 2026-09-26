import type { DayChild, PermanenceOffer } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'

type PermanenceRowProps = { exitTime: string; offers: PermanenceOffer[]; roster: DayChild[] }

/** "Permanence HH:MM" above the trip it would join, with one chip per child it is offered to. */
export function PermanenceRow({ exitTime, offers, roster }: PermanenceRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
      <span className="mr-0.5 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Permanence {exitTime}
      </span>
      {offers.map((offer) => {
        const child = roster.find((candidate) => candidate.childId === offer.childId)
        return (
          <ChildChip
            key={offer.childId}
            label={child?.firstName ?? offer.childId}
            colorSlot={child?.colorSlot ?? 1}
            active={offer.active}
          />
        )
      })}
    </div>
  )
}
