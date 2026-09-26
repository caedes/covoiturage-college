import { cn } from '../../lib/utils'
import type { ColorSlot } from '../../planning/types'
import { CHILD_AVATAR } from './childColors'

type ChildAvatarProps = { name: string; colorSlot: ColorSlot }

/** The child's initial in their colours; screen readers get the first name instead. */
export function ChildAvatar({ name, colorSlot }: ChildAvatarProps) {
  return (
    <span
      className={cn(
        'grid size-6 place-items-center rounded-full border font-heading text-sm font-semibold text-foreground',
        CHILD_AVATAR[colorSlot],
      )}
    >
      <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      <span className="sr-only">{name}</span>
    </span>
  )
}
