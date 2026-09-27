import type { Presence } from '../../planning/types'
import { RadioGroupItem } from '../atoms/ui/radio-group'

type PresenceOptionProps = { id: string; value: Presence; label: string }

/** One choice of the presence panel. The whole row answers to a click, through its label. */
export function PresenceOption({ id, value, label }: PresenceOptionProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl pl-3 has-data-[state=checked]:bg-accent">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="flex-1 cursor-pointer py-2.5 pr-3 text-sm">
        {label}
      </label>
    </div>
  )
}
