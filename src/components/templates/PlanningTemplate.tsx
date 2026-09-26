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
      <h1 className="font-heading text-3xl font-semibold leading-tight">Trajets collège</h1>
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
          {recap}
        </TabsContent>
      </Tabs>
    </>
  )
}
