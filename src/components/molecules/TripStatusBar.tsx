import { actionLabel, statusLabel } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { TripAction, TripStatus } from '../../planning/types'
import { StatusIcon } from '../atoms/StatusIcon'
import { Button } from '../atoms/ui/button'

const STYLES: Record<TripStatus['kind'], string> = {
  void: 'bg-muted text-secondary-foreground',
  open: 'bg-warning text-warning-foreground',
  mine: 'bg-accent font-heading text-base font-semibold text-accent-foreground',
  covered: 'bg-success font-heading text-base font-semibold text-success-foreground',
}

type StatusAction = {
  kind: TripAction
  accessibleLabel: string
  pending: boolean
  onClick: () => void
}

const BUTTON: Record<TripAction, { variant: 'default' | 'outline' | 'link'; className: string }> = {
  take: { variant: 'default', className: 'rounded-full font-heading' },
  takeOver: { variant: 'outline', className: 'rounded-full font-heading bg-transparent' },
  cancel: { variant: 'link', className: 'px-1 text-foreground underline underline-offset-4' },
}

/** The trip's status in words, on the background of its kind, with the action offered if any. */
export function TripStatusBar({
  status,
  action = null,
}: {
  status: TripStatus
  action?: StatusAction | null
}) {
  return (
    <div
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm', STYLES[status.kind])}
    >
      <StatusIcon kind={status.kind} />
      <span className="min-w-0 flex-1">{statusLabel(status)}</span>
      {action === null ? null : (
        <Button
          type="button"
          size="sm"
          variant={BUTTON[action.kind].variant}
          className={cn(
            'shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            BUTTON[action.kind].className,
          )}
          aria-label={action.accessibleLabel}
          aria-busy={action.pending}
          aria-disabled={action.pending}
          onClick={action.pending ? undefined : action.onClick}
        >
          {actionLabel(action.kind)}
        </Button>
      )}
    </div>
  )
}
