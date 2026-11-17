import { useId } from 'react'
import { cn } from '../../lib/utils'
import type { Time } from '../../planning/types'
import { RadioGroup, RadioGroupChip } from '../atoms/ui/radio-group'

type HourPickerProps = {
  label: string
  times: Time[]
  /** The hour of the timetable, drawn dashed. */
  usual: Time
  value: Time
  onChange: (time: Time) => void
}

/**
 * One hour among the school's bells, as a row of pills: the usual hour dashed, the chosen one
 * filled. Each choice is passed on as soon as it is made, arrow keys included.
 */
export function HourPicker({ label, times, usual, value, onChange }: HourPickerProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        orientation="horizontal"
        value={value}
        onValueChange={(next) => {
          const time = times.find((candidate) => candidate === next)
          if (time !== undefined) {
            onChange(time)
          }
        }}
        className="flex flex-wrap gap-1.5"
      >
        {times.map((time) => (
          <RadioGroupChip
            key={time}
            value={time}
            className={cn(time === usual && 'border-dashed border-foreground/40')}
          >
            {time}
          </RadioGroupChip>
        ))}
      </RadioGroup>
    </div>
  )
}
