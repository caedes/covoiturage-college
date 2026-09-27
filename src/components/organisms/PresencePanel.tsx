import { useId } from 'react'
import { presenceOptionLabel, presencePanelLabel } from '../../lib/planningLabels'
import type { DayChild, Presence } from '../../planning/types'
import { RadioGroup } from '../atoms/ui/radio-group'
import { PresenceOption } from '../molecules/PresenceOption'

const PRESENCES: Presence[] = ['present', 'absent', 'sansCovoiturage']

type PresencePanelProps = {
  id: string
  child: DayChild
  onChange: (presence: Presence) => void
  onClose: () => void
}

/**
 * The three presences of one child. Each choice is saved as soon as it is made — arrow keys
 * included, as in any radio group; Escape closes the panel.
 */
export function PresencePanel({ id, child, onChange, onClose }: PresencePanelProps) {
  const optionId = useId()
  return (
    <RadioGroup
      id={id}
      aria-label={presencePanelLabel(child.firstName)}
      value={child.presence}
      onValueChange={(value) => {
        const next = PRESENCES.find((presence) => presence === value)
        if (next !== undefined) {
          onChange(next)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      className="gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm"
    >
      {PRESENCES.map((presence) => (
        <PresenceOption
          key={presence}
          id={`${optionId}-${presence}`}
          value={presence}
          label={presenceOptionLabel(child.gender, presence)}
        />
      ))}
    </RadioGroup>
  )
}
