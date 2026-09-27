import { describe, expect, it } from 'vitest'
import { defaultUid } from './fakeAuth'
import { planning } from './fakePlanning'
import { carpool } from './planningFixtures'

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
})
