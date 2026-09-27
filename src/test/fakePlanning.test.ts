import { describe, expect, it } from 'vitest'
import type { PlanningSnapshot } from '../planning/ports'
import { defaultUid } from './fakeAuth'
import { planning } from './fakePlanning'
import { carpool, childDay } from './planningFixtures'

const ALLER = {
  date: '2026-09-30',
  direction: 'aller',
  place: 'centre-bourg',
  time: '07:40',
} as const

describe('fausse planification', () => {
  it('un second clic sur un trajet que je viens de prendre ne signale aucun conflit', async () => {
    const store = planning({
      carpools: [carpool({ ...ALLER, driverUid: defaultUid, driverName: 'Sophie' })],
    })
    const outcome = await store.repository.take(ALLER, { uid: defaultUid, firstName: 'Sophie' })
    expect(outcome).toEqual({ status: 'done' })
  })

  it('annuler un trajet repris entre-temps par un autre ne supprime rien', async () => {
    const store = planning({
      carpools: [carpool({ ...ALLER, driverUid: 'uid-paul', driverName: 'Paul' })],
    })
    const outcome = await store.repository.cancel(ALLER, { uid: defaultUid, firstName: 'Sophie' })
    expect(outcome).toEqual({ status: 'done' })

    let carpools: unknown
    store.repository.subscribe(
      { from: ALLER.date, to: ALLER.date },
      (snapshot) => {
        carpools = snapshot.carpools
      },
      () => {},
    )
    expect(carpools).toEqual([{ ...ALLER, driverUid: 'uid-paul', driverName: 'Paul' }])
  })

  it("remplace les options d'une journée et les réémet aux abonnés", async () => {
    const store = planning({
      childDays: [childDay({ date: '2026-10-01', childId: 'alice', presence: 'absent' })],
    })
    const received: PlanningSnapshot[] = []
    store.repository.subscribe(
      { from: '2026-09-28', to: '2026-10-09' },
      (snapshot) => received.push(snapshot),
      () => {},
    )
    const next = childDay({ date: '2026-10-01', childId: 'alice', skipped: ['aller'] })
    expect(await store.repository.saveChildDay(next, defaultUid)).toEqual({ status: 'done' })
    expect(received.at(-1)?.childDays).toEqual([next])
    expect(store.writes()).toEqual([
      { kind: 'saveChildDay', key: '2026-10-01_alice', childDay: next, authorUid: defaultUid },
    ])
  })

  it("n'écrit aucune option quand l'issue est forcée", async () => {
    const store = planning({}, { writeOutcome: { status: 'refused' } })
    const received: PlanningSnapshot[] = []
    store.repository.subscribe(
      { from: '2026-09-28', to: '2026-10-09' },
      (snapshot) => received.push(snapshot),
      () => {},
    )
    const next = childDay({ date: '2026-10-01', childId: 'alice', presence: 'absent' })
    expect(await store.repository.saveChildDay(next, defaultUid)).toEqual({ status: 'refused' })
    expect(received.at(-1)?.childDays).toEqual([])
  })
})
