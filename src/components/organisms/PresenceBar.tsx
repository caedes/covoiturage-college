import { useId } from 'react'
import { presenceLabel } from '../../lib/planningLabels'
import type { DayChild } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'

export function PresenceBar({ roster }: { roster: DayChild[] }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-wrap items-center gap-2">
      <h2
        id={titleId}
        className="mr-1 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
      >
        Présence
      </h2>
      <ul className="flex flex-wrap gap-2">
        {roster.map((child) => (
          <li key={child.childId}>
            <ChildChip
              label={presenceLabel(child.firstName, child.gender, child.presence)}
              colorSlot={child.colorSlot}
              active={child.presence === 'present'}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
