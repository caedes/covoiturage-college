import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'
import { CHILD_CHIP } from '../atoms/childColors'

type ChildChipProps = { label: string; colorSlot: ColorSlot; active: boolean }

/** A child's chip: filled in their colours when active, dashed when not. Display only for now. */
export function ChildChip({ label, colorSlot, active }: ChildChipProps) {
  return (
    <span
      data-active={active}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
        active
          ? cn(CHILD_CHIP[colorSlot], 'text-foreground')
          : 'border-dashed border-foreground/25 bg-transparent text-secondary-foreground',
      )}
    >
      {label}
    </span>
  )
}
