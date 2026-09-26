import { TabsList, TabsTrigger } from '../atoms/ui/tabs'

/** The two week tabs and the displayed range. Must sit inside a `Tabs` valued `current` / `next`. */
export function WeekTabs({ range }: { range: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <TabsList className="rounded-full">
        <TabsTrigger
          value="current"
          className="rounded-full font-heading data-[state=inactive]:text-secondary-foreground"
        >
          Cette semaine
        </TabsTrigger>
        <TabsTrigger
          value="next"
          className="rounded-full font-heading data-[state=inactive]:text-secondary-foreground"
        >
          Semaine prochaine
        </TabsTrigger>
      </TabsList>
      <span className="text-sm text-muted-foreground">{range}</span>
    </div>
  )
}
