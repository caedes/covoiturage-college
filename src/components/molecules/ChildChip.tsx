import type { Ref } from 'react'
import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'
import { CHILD_CHIP } from '../atoms/childColors'

type ChildChipProps = {
  label: string
  colorSlot: ColorSlot
  active: boolean
  /** Turns the chip into a button; without it, the chip only displays. */
  onClick?: () => void
  /** Toggle button: announced as pressed or not. */
  pressed?: boolean
  /** Disclosure button: whether the panel it controls is open. */
  expanded?: boolean
  controls?: string
  ref?: Ref<HTMLButtonElement>
}

/** A child's chip: filled in their colours when active, dashed when not. */
export function ChildChip({
  label,
  colorSlot,
  active,
  onClick,
  pressed,
  expanded,
  controls,
  ref,
}: ChildChipProps) {
  const className = cn(
    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
    active
      ? cn(CHILD_CHIP[colorSlot], 'text-foreground')
      : 'border-dashed border-foreground/25 bg-transparent text-secondary-foreground',
  )
  if (onClick === undefined) {
    return (
      <span data-active={active} className={className}>
        {label}
      </span>
    )
  }
  return (
    <button
      ref={ref}
      type="button"
      data-active={active}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={cn(className, 'cursor-pointer')}
    >
      {label}
    </button>
  )
}
