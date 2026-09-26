import { recapLabel, recapPercent } from '../../lib/planningLabels'
import { cn } from '../../lib/utils'
import type { WeekRecap } from '../../planning/types'
import { Progress } from '../atoms/ui/progress'

export function WeeklyRecap({ recap, period }: { recap: WeekRecap; period: string }) {
  const percent = recapPercent(recap)
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{recapLabel(recap, period)}</span>
        <span
          className={cn(
            'font-heading font-semibold',
            percent === 100 ? 'text-success-foreground' : 'text-primary',
          )}
        >
          {percent} %
        </span>
      </div>
      <Progress value={percent} aria-label="Part des trajets couverts" className="h-1" />
    </div>
  )
}
