import { TriangleAlertIcon } from 'lucide-react'
import { useId, useState } from 'react'
import {
  hourPickerLabel,
  hoursEffectMessage,
  hoursOptionLabel,
  presenceOptionLabel,
  presencePanelLabel,
} from '../../lib/planningLabels'
import type { DayChild, DayHours, HoursChange, Presence } from '../../planning/types'
import { RadioGroup } from '../atoms/ui/radio-group'
import { HourPicker } from '../molecules/HourPicker'
import { PresenceOption } from '../molecules/PresenceOption'

const PRESENCES: Presence[] = ['present', 'absent', 'sansCovoiturage']

/** The panel's choices: « horaires modifiés » comes second, right under « covoiturage normal ». */
type Choice = Presence | 'hours'

/** Whether the day's effective hours differ from the timetable. */
export function hoursModified(hours: DayHours | undefined): hours is DayHours {
  return hours !== undefined && (hours.start !== hours.usual.start || hours.end !== hours.usual.end)
}

type PresencePanelProps = {
  id: string
  child: DayChild
  onChange: (presence: Presence) => void
  onHoursChange: (change: HoursChange) => void
  onClose: () => void
}

/**
 * The presences of one child, plus « horaires modifiés » when their hours are known. Each choice
 * is saved as soon as it is made — arrow keys included, as in any radio group — except
 * « horaires modifiés », which only shows the hour pickers until an hour is chosen. The pickers
 * sit under the choices, since a radio group cannot hold another. The effect message lives in a
 * status region mounted with the pickers, so that a message appearing later is announced. Escape
 * closes the panel from any of its radios: the card is an unnamed fieldset that only listens for
 * it, the presence radio group carrying the name.
 */
export function PresencePanel({ id, child, onChange, onHoursChange, onClose }: PresencePanelProps) {
  const optionId = useId()
  const [hoursPicked, setHoursPicked] = useState(false)
  const { hours } = child
  const modified = child.presence === 'present' && hoursModified(hours)
  const checked: Choice =
    hours !== undefined && child.presence === 'present' && (hoursPicked || modified)
      ? 'hours'
      : child.presence
  const choices: Choice[] =
    hours === undefined ? PRESENCES : ['present', 'hours', 'absent', 'sansCovoiturage']
  const message =
    checked === 'hours' && hours !== undefined ? hoursEffectMessage(hours.effect) : null

  function choose(value: string) {
    if (value === 'hours') {
      setHoursPicked(true)
      return
    }
    const next = PRESENCES.find((presence) => presence === value)
    if (next === undefined) {
      return
    }
    setHoursPicked(false)
    if (next === 'present' && child.presence === 'present' && !modified) {
      return
    }
    onChange(next)
  }

  function changeHours(change: HoursChange) {
    setHoursPicked(true)
    onHoursChange(change)
  }

  return (
    <fieldset
      id={id}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      className="m-0 flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm"
    >
      <RadioGroup
        aria-label={presencePanelLabel(child.firstName)}
        value={checked}
        onValueChange={choose}
        className="gap-1"
      >
        {choices.map((choice) => (
          <PresenceOption
            key={choice}
            id={`${optionId}-${choice}`}
            value={choice}
            label={
              choice === 'hours'
                ? hoursOptionLabel(child.gender)
                : presenceOptionLabel(child.gender, choice)
            }
          />
        ))}
      </RadioGroup>
      {checked !== 'hours' || hours === undefined ? null : (
        <div className="flex flex-col gap-3 px-3 pb-2">
          <HourPicker
            label={hourPickerLabel('start', child.firstName)}
            times={hours.bellTimes.starts}
            usual={hours.usual.start}
            value={hours.start}
            onChange={(start) => changeHours({ start })}
          />
          <HourPicker
            label={hourPickerLabel('end', child.firstName)}
            times={hours.bellTimes.ends}
            usual={hours.usual.end}
            value={hours.end}
            onChange={(end) => changeHours({ end })}
          />
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl bg-warning px-3 py-2 text-sm text-warning-foreground empty:hidden"
          >
            {message === null ? null : (
              <>
                <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {message}
              </>
            )}
          </p>
        </div>
      )}
    </fieldset>
  )
}
