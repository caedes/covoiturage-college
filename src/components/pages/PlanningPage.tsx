import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { weekRangeLabel, writeFailureMessage, writeSuccessMessage } from '../../lib/planningLabels'
import { addDays, displayedMonday, initialDay, parisToday } from '../../planning/dates'
import { ZONE_A_2026_2027 } from '../../planning/holidays'
import type { DayPlan, PlannedTrip } from '../../planning/types'
import { buildWeek } from '../../planning/week'
import { Button } from '../atoms/ui/button'
import { ActionAlert } from '../molecules/ActionAlert'
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
  const { now, repository } = usePlanningContext()
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

  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ id: number; message: string } | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const nextAlertId = useRef(1)

  /** An alert goes away by itself after eight seconds, or at once with « Fermer »; a repeated
   * alert gets a fresh id, so it is re-announced and its timer restarts even if the text is
   * identical to the one just dismissed. */
  useEffect(() => {
    if (alert === null) {
      return
    }
    const timer = setTimeout(() => setAlert(null), 8_000)
    return () => clearTimeout(timer)
  }, [alert])

  const act = useCallback(
    async (trip: PlannedTrip) => {
      if (state.status !== 'member' || trip.action === null) {
        return
      }
      const driver = { uid: state.uid, firstName: state.member.firstName }
      setPendingKey(trip.key)
      try {
        const outcome =
          trip.action === 'take'
            ? await repository.take(trip, driver)
            : trip.action === 'cancel'
              ? await repository.cancel(trip, driver)
              : trip.status.kind === 'covered'
                ? await repository.takeOver(trip, driver, trip.status.driverUid)
                : await repository.take(trip, driver)
        if (outcome.status === 'done') {
          setConfirmation(writeSuccessMessage(trip.action, trip.time, trip.label))
        } else {
          setAlert({ id: nextAlertId.current++, message: writeFailureMessage(outcome) })
        }
      } catch {
        setAlert({ id: nextAlertId.current++, message: writeFailureMessage({ status: 'failed' }) })
      } finally {
        setPendingKey(null)
      }
    },
    [repository, state],
  )

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
    viewerCanDrive: state.status === 'member' && state.member.role === 'parent',
    viewerChildIds: state.status === 'member' ? state.member.childIds : [],
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
    <>
      <PlanningTemplate
        tab={tab}
        onTabChange={changeTab}
        weekTabs={<WeekTabs range={weekRangeLabel(monday)} />}
        days={<DaySelector days={week.days} selected={day.date} onSelect={setSelected} />}
        notice={notice === null ? null : <p className="text-sm text-muted-foreground">{notice}</p>}
        presence={empty ? null : <PresenceBar roster={day.children} />}
        aller={
          empty ? null : (
            <TripSection
              title="Aller"
              trips={day.aller}
              roster={day.children}
              onAction={act}
              pendingKey={pendingKey}
            />
          )
        }
        retour={
          empty ? null : (
            <TripSection
              title="Retour"
              trips={day.retour}
              roster={day.children}
              onAction={act}
              pendingKey={pendingKey}
            />
          )
        }
        recap={
          <WeeklyRecap
            recap={week.recap}
            period={tab === 'current' ? 'cette semaine' : 'la semaine prochaine'}
          />
        }
      />
      <p aria-live="polite" className="sr-only">
        {confirmation}
      </p>
      {alert === null ? null : (
        <ActionAlert key={alert.id} message={alert.message} onDismiss={() => setAlert(null)} />
      )}
    </>
  )
}
