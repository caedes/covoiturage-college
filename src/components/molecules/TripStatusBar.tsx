import { statusLabel } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { TripStatus } from '../../planning/types'
import { StatusIcon } from '../atoms/StatusIcon'

const STYLES: Record<TripStatus['kind'], string> = {
  void: 'bg-muted text-secondary-foreground',
  open: 'bg-warning text-warning-foreground',
  mine: 'bg-accent font-heading text-base font-semibold text-accent-foreground',
  covered: 'bg-success font-heading text-base font-semibold text-success-foreground',
}

/** The trip's status in words, on the background of its kind. */
export function TripStatusBar({ status }: { status: TripStatus }) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', STYLES[status.kind])}
    >
      <StatusIcon kind={status.kind} />
      <span>{statusLabel(status)}</span>
    </div>
  )
}
