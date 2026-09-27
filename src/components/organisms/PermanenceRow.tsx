import { useId } from 'react'
import type { DayChild, PermanenceOffer } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'

type PermanenceRowProps = {
  exitTime: string
  offers: PermanenceOffer[]
  roster: DayChild[]
  onToggle?: (offer: PermanenceOffer) => void
}

/**
 * "Permanence HH:MM" above the trip it would join, with one chip per child it is offered to. The
 * viewer's own children toggle it; the others only show whether they stay.
 */
export function PermanenceRow({ exitTime, offers, roster, onToggle }: PermanenceRowProps) {
  const titleId = useId()
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would break this inline flex row; role="group" plus aria-labelledby is a valid ARIA group.
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-wrap items-center gap-2 px-0.5"
    >
      <span
        id={titleId}
        className="mr-0.5 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        Permanence {exitTime}
      </span>
      {offers.map((offer) => {
        const child = roster.find((candidate) => candidate.childId === offer.childId)
        const editable = child?.editable === true && onToggle !== undefined
        return (
          <ChildChip
            key={offer.childId}
            label={child?.firstName ?? offer.childId}
            colorSlot={child?.colorSlot ?? 1}
            active={offer.active}
            pressed={editable ? offer.active : undefined}
            onClick={editable && onToggle !== undefined ? () => onToggle(offer) : undefined}
          />
        )
      })}
    </div>
  )
}
