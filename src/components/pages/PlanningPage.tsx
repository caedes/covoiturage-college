import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { weekRangeLabel } from '../../lib/planningLabels'
import { addDays, displayedMonday, initialDay, parisToday } from '../../planning/dates'
import { ZONE_A_2026_2027 } from '../../planning/holidays'
import type { DayPlan } from '../../planning/types'
import { buildWeek } from '../../planning/week'
import { Button } from '../atoms/ui/button'
import { DaySelector } from '../organisms/DaySelector'
import { PresenceBar } from '../organisms/PresenceBar'
import { TripSection } from '../organisms/TripSection'
import { WeeklyRecap } from '../organisms/WeeklyRecap'
import { WeekTabs } from '../organisms/WeekTabs'
import { PlanningTemplate, type WeekTab } from '../templates/PlanningTemplate'
import { usePlanningContext } from './PlanningContext'
import { usePlanning } from './usePlanning'

const TITLE_CLASS = 'font-heading text-3xl font-semibold leading-tight'

function noticeFor(day: DayPlan, today: string): string | null {
  if (day.holiday) {
    return 'Vacances scolaires : aucun trajet ce jour-là.'
  }
  if (day.aller.length === 0 && day.retour.length === 0) {
    return "L'emploi du temps de ce jour n'est pas encore disponible."
  }
  if (day.locked) {
    return 'Journée passée : plus rien ne peut y être modifié.'
  }
  return day.date === today ? "Aujourd'hui" : null
}

/** The planning of `/`: the only component that reads the planning port and builds the week. */
export function PlanningPage() {
  const { now } = usePlanningContext()
  const { state } = useAuth()
  const [today, setToday] = useState(() => parisToday(now()))
  const thisMonday = displayedMonday(today)
  const nextMonday = addDays(thisMonday, 7)
  const range = useMemo(
    () => ({ from: thisMonday, to: addDays(nextMonday, 4) }),
    [thisMonday, nextMonday],
  )
  const [tab, setTab] = useState<WeekTab>('current')
  const [selected, setSelected] = useState(() => initialDay(today))

  /** Keeps "today" true while the page stays open: on tab focus, on return from another app, and every minute. */
  useEffect(() => {
    function checkToday() {
      const next = parisToday(now())
      if (next !== today) {
        setToday(next)
        setTab('current')
        setSelected(initialDay(next))
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkToday()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', checkToday)
    const interval = setInterval(checkToday, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', checkToday)
      clearInterval(interval)
    }
  }, [now, today])

  const { load, retry } = usePlanning(range)

  if (load.status === 'loading') {
    return (
      <>
        <h1 className={TITLE_CLASS}>Trajets collège</h1>
        <p role="status" className="mt-3 text-muted-foreground">
          Chargement du planning…
        </p>
      </>
    )
  }

  if (load.status === 'error') {
    return (
      <>
        <h1 className={TITLE_CLASS}>Trajets collège</h1>
        <p role="alert" className="mt-3 text-destructive">
          Impossible de charger le planning. Vérifiez votre connexion internet, puis réessayez.
        </p>
        <Button type="button" className="mt-3" onClick={retry}>
          Réessayer
        </Button>
      </>
    )
  }

  const monday = tab === 'current' ? thisMonday : nextMonday
  const week = buildWeek({
    monday,
    today,
    ...load.snapshot,
    viewerUid: state.status === 'member' ? state.uid : '',
    holidays: ZONE_A_2026_2027,
  })
  const day = week.days.find((candidate) => candidate.date === selected) ?? week.days[0]
  if (day === undefined) {
    return null
  }
  const notice = noticeFor(day, today)
  const empty = day.holiday || (day.aller.length === 0 && day.retour.length === 0)

  function changeTab(next: WeekTab) {
    setTab(next)
    setSelected(next === 'current' ? initialDay(today) : nextMonday)
  }

  return (
    <PlanningTemplate
      tab={tab}
      onTabChange={changeTab}
      weekTabs={<WeekTabs range={weekRangeLabel(monday)} />}
      days={<DaySelector days={week.days} selected={day.date} onSelect={setSelected} />}
      notice={notice === null ? null : <p className="text-sm text-muted-foreground">{notice}</p>}
      presence={empty ? null : <PresenceBar roster={day.children} />}
      aller={empty ? null : <TripSection title="Aller" trips={day.aller} roster={day.children} />}
      retour={
        empty ? null : <TripSection title="Retour" trips={day.retour} roster={day.children} />
      }
      recap={
        <WeeklyRecap
          recap={week.recap}
          period={tab === 'current' ? 'cette semaine' : 'la semaine prochaine'}
        />
      }
    />
  )
}
