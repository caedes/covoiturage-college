import { useId, useRef, useState } from 'react'
import { presenceLabel } from '../../lib/planningLabels'
import type { ChildId, DayChild, HoursChange, Presence } from '../../planning/types'
import { ChildChip } from '../molecules/ChildChip'
import { hoursModified, PresencePanel } from './PresencePanel'

type PresenceBarProps = {
  roster: DayChild[]
  onPresenceChange?: (childId: ChildId, presence: Presence) => void
  /** Without it, the panel keeps its three presences and offers no hours. */
  onHoursChange?: (childId: ChildId, change: HoursChange) => void
}

/**
 * The day's presence of each child, with their hours when modified. The viewer's own children
 * open a panel with their choices; one panel at a time, and closing it hands the focus back to
 * its chip.
 */
export function PresenceBar({ roster, onPresenceChange, onHoursChange }: PresenceBarProps) {
  const titleId = useId()
  const panelId = useId()
  const [openId, setOpenId] = useState<ChildId | null>(null)
  const chips = useRef(new Map<ChildId, HTMLButtonElement>())
  const open = roster.find((child) => child.childId === openId && child.editable)

  function close() {
    const chip = openId === null ? undefined : chips.current.get(openId)
    setOpenId(null)
    chip?.focus()
  }

  function register(childId: ChildId) {
    return (node: HTMLButtonElement | null) => {
      if (node === null) {
        chips.current.delete(childId)
      } else {
        chips.current.set(childId, node)
      }
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id={titleId}
          className="mr-1 font-heading text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Présence
        </h2>
        <ul className="flex flex-wrap gap-2">
          {roster.map((child) => {
            const editable = child.editable && onPresenceChange !== undefined
            const isOpen = open?.childId === child.childId
            return (
              <li key={child.childId}>
                <ChildChip
                  label={presenceLabel(
                    child.firstName,
                    child.gender,
                    child.presence,
                    hoursModified(child.hours) ? child.hours : undefined,
                  )}
                  colorSlot={child.colorSlot}
                  active={child.presence === 'present'}
                  onClick={
                    editable
                      ? () =>
                          setOpenId((current) => (current === child.childId ? null : child.childId))
                      : undefined
                  }
                  expanded={editable ? isOpen : undefined}
                  controls={isOpen ? panelId : undefined}
                  ref={editable ? register(child.childId) : undefined}
                />
              </li>
            )
          })}
        </ul>
      </div>
      {open === undefined || onPresenceChange === undefined ? null : (
        <PresencePanel
          key={open.childId}
          id={panelId}
          child={onHoursChange === undefined ? withoutHours(open) : open}
          onChange={(presence) => onPresenceChange(open.childId, presence)}
          onHoursChange={(change) => onHoursChange?.(open.childId, change)}
          onClose={close}
        />
      )}
    </section>
  )
}

/** The child as a panel without hour pickers sees them. */
function withoutHours({ hours: _hours, ...child }: DayChild): DayChild {
  return child
}
