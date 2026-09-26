import { cn } from '../../lib/utils'

type DayPillProps = {
  short: string
  label: string
  dayNumber: number
  selected: boolean
  covered: boolean
  onSelect: () => void
}

/**
 * One day of the selector. `label` is the final accessible name — the full day and, when covered,
 * the coverage the green dot alone would only tell sighted users — built by `dayButtonLabel`.
 */
export function DayPill({ short, label, dayNumber, selected, covered, onSelect }: DayPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 rounded-2xl border pt-2 pb-1.5',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground',
      )}
    >
      <span className="text-xs uppercase tracking-wider">{short}</span>
      <span className="font-heading text-xl font-semibold leading-none">{dayNumber}</span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-1 rounded-full',
          covered
            ? selected
              ? 'bg-primary-foreground'
              : 'bg-success-foreground'
            : 'bg-transparent',
        )}
      />
    </button>
  )
}
