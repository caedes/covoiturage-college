import type { ColorSlot } from '../../planning/types'

/**
 * Static class strings, spelled out so that Tailwind finds them. The initial and the chip text stay
 * in `text-foreground`: the child's colour is carried by the background and the border, which
 * keeps every label above the AA contrast ratio.
 */
export const CHILD_AVATAR: Record<ColorSlot, string> = {
  1: 'border-child-1-border bg-child-1',
  2: 'border-child-2-border bg-child-2',
  3: 'border-child-3-border bg-child-3',
}

export const CHILD_CHIP: Record<ColorSlot, string> = CHILD_AVATAR
