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
    <fieldset className="grid min-w-0 grid-cols-5 gap-2 border-0 m-0 p-0">
      <legend className="sr-only">Jours de la semaine</legend>
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
