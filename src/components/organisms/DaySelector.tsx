import { dayButtonLabel, dayNumber, dayShortLabel } from '../../lib/planningLabels'
import type { DayPlan, IsoDate } from '../../planning/types'
import { DayPill } from '../molecules/DayPill'

type DaySelectorProps = {
  days: Pick<DayPlan, 'date' | 'weekday' | 'covered'>[]
  selected: IsoDate
  onSelect: (date: IsoDate) => void
}

export function DaySelector({ days, selected, onSelect }: DaySelectorProps) {
  return (
    <fieldset aria-label="Jours de la semaine" className="grid grid-cols-5 gap-2 border-0 p-0 m-0">
      {days.map((day) => (
        <DayPill
          key={day.date}
          short={dayShortLabel(day.weekday)}
          label={dayButtonLabel(day.weekday, day.date, day.covered)}
          dayNumber={dayNumber(day.date)}
          selected={day.date === selected}
          covered={day.covered}
          onSelect={() => onSelect(day.date)}
        />
      ))}
    </fieldset>
  )
}
