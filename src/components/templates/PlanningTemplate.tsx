import type { ReactNode } from 'react'
import { Tabs, TabsContent } from '../atoms/ui/tabs'

export type WeekTab = 'current' | 'next'

type PlanningTemplateProps = {
  tab: WeekTab
  onTabChange: (tab: WeekTab) => void
  weekTabs: ReactNode
  days: ReactNode
  notice: ReactNode
  presence: ReactNode
  aller: ReactNode
  retour: ReactNode
  recap: ReactNode
}

/**
 * The week's planning. The recap leaves the tab panel for a band fixed right above the bottom
 * navigation, on the page background, while the rest of the planning scrolls beneath it.
 */
export function PlanningTemplate({
  tab,
  onTabChange,
  weekTabs,
  days,
  notice,
  presence,
  aller,
  retour,
  recap,
}: PlanningTemplateProps) {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight">Covoiturage</h1>
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value === 'next' ? 'next' : 'current')}
        className="mt-3 flex flex-col gap-4"
      >
        {weekTabs}
        <TabsContent value={tab} className="flex flex-col gap-4">
          {days}
          {notice}
          {presence}
          {aller}
          {retour}
        </TabsContent>
      </Tabs>
      <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-30 bg-background">
        <div className="mx-auto max-w-md px-4 pb-1.5">{recap}</div>
      </div>
    </>
  )
}
