import type { WeekType } from '../../planning/types'
import { TabsList, TabsTrigger } from '../atoms/ui/tabs'

/**
 * The two week tabs and the displayed range. Must sit inside a `Tabs` valued `current` / `next`.
 * Each tab names the A/B week type of its own week, whichever tab is selected.
 */
export function WeekTabs({
  range,
  currentWeekType,
  nextWeekType,
}: {
  range: string
  currentWeekType: WeekType
  nextWeekType: WeekType
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <TabsList className="rounded-full">
        <TabsTrigger
          value="current"
          className="rounded-full font-heading data-[state=inactive]:text-secondary-foreground"
        >
          Cette semaine ({currentWeekType})
        </TabsTrigger>
        <TabsTrigger
          value="next"
          className="rounded-full font-heading data-[state=inactive]:text-secondary-foreground"
        >
          Semaine prochaine ({nextWeekType})
        </TabsTrigger>
      </TabsList>
      <span className="text-sm text-muted-foreground">{range}</span>
    </div>
  )
}
