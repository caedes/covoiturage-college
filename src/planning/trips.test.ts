import { describe, expect, it } from 'vitest'
import { childDay, timetable } from '../test/planningFixtures'
import { applyChildDay, defaultLegs } from './legs'
import { carpoolKey, groupTrips, permanenceOffers } from './trips'
import type { ChildDay, Leg } from './types'

const MONDAY_A = '2026-09-28'
const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'
const ORDER = ['alice', 'basile', 'chloe']

function legsOf(date: string, days: ChildDay[] = [], table = timetable()): Leg[] {
  return ORDER.flatMap((id) =>
    applyChildDay(
      table,
      date,
      defaultLegs(table, id, date),
      days.find((day) => day.childId === id),
    ),
  )
}

function daysMap(days: ChildDay[]): Map<string, ChildDay> {
  return new Map(days.map((day) => [day.childId, day]))
}

describe('carpoolKey', () => {
  it('forme l’identifiant du document carpools', () => {
    expect(carpoolKey('2026-09-23', 'retour', 'college', '13:15')).toBe(
      '2026-09-23_retour_college_1315',
    )
  })
})

describe('groupTrips', () => {
  it('regroupe les enfants par sens, lieu et heure, Aller en tête puis par heure', () => {
    expect(groupTrips(MONDAY_A, legsOf(MONDAY_A), ORDER)).toEqual([
      {
        key: '2026-09-28_aller_centre-bourg_0740',
        date: MONDAY_A,
        direction: 'aller',
        place: 'centre-bourg',
        mode: 'bus',
        time: '07:40',
        label: 'Maison → Centre-bourg',
        riders: ['alice', 'basile', 'chloe'],
        excluded: [],
      },
      {
        key: '2026-09-28_retour_college_1600',
        date: MONDAY_A,
        direction: 'retour',
        place: 'college',
        mode: 'car',
        time: '16:00',
        label: 'Collège → Maison',
        riders: ['alice', 'chloe'],
        excluded: [],
      },
      {
        key: '2026-09-28_retour_centre-bourg_1745',
        date: MONDAY_A,
        direction: 'retour',
        place: 'centre-bourg',
        mode: 'bus',
        time: '17:45',
        label: 'Centre-bourg → Maison',
        riders: ['basile'],
        excluded: [],
      },
    ])
  })

  it('garde un enfant retiré dans le trajet, avec la raison, hors des passagers', () => {
    const trips = groupTrips(
      MONDAY_A,
      legsOf(MONDAY_A, [childDay({ date: MONDAY_A, childId: 'chloe', presence: 'absent' })]),
      ORDER,
    )
    expect(trips[1]).toMatchObject({
      riders: ['alice'],
      excluded: [{ childId: 'chloe', reason: 'absent' }],
    })
  })

  it("range les passagers dans l'ordre donné, pas dans celui des trajets reçus", () => {
    const trips = groupTrips(MONDAY_A, [...legsOf(MONDAY_A)].reverse(), ORDER)
    expect(trips[0]?.riders).toEqual(['alice', 'basile', 'chloe'])
  })
})

describe('permanenceOffers', () => {
  it("propose à l'enfant qui sort tôt de rejoindre le bus du soir", () => {
    expect(permanenceOffers(timetable(), MONDAY_A, ORDER, daysMap([]))).toEqual([
      {
        childId: 'alice',
        exitTime: '17:00',
        tripKey: '2026-09-28_retour_centre-bourg_1745',
        active: false,
      },
      {
        childId: 'chloe',
        exitTime: '17:00',
        tripKey: '2026-09-28_retour_centre-bourg_1745',
        active: false,
      },
    ])
  })

  it("propose chaque sortie plus tardive d'un autre enfant, dans l'ordre", () => {
    const alice = permanenceOffers(timetable(), THURSDAY, ORDER, daysMap([])).filter(
      (offer) => offer.childId === 'alice',
    )
    expect(alice.map((offer) => [offer.exitTime, offer.tripKey])).toEqual([
      ['16:00', '2026-10-01_retour_college_1600'],
      ['17:00', '2026-10-01_retour_centre-bourg_1745'],
    ])
  })

  it('ne propose rien le mercredi', () => {
    expect(permanenceOffers(timetable(), WEDNESDAY, ORDER, daysMap([]))).toEqual([])
  })

  it("ne propose rien à un enfant absent, ni la sortie d'un enfant absent", () => {
    const table = timetable({ eveningBuses: [] })
    const offers = permanenceOffers(
      table,
      THURSDAY,
      ORDER,
      daysMap([childDay({ date: THURSDAY, childId: 'basile', presence: 'absent' })]),
    )
    expect(offers.filter((offer) => offer.childId === 'basile')).toEqual([])
    expect(
      offers.filter((offer) => offer.childId === 'alice').map((offer) => offer.exitTime),
    ).toEqual(['16:00'])
  })

  it('ne propose rien à un enfant retiré du retour', () => {
    const offers = permanenceOffers(
      timetable(),
      MONDAY_A,
      ORDER,
      daysMap([childDay({ date: MONDAY_A, childId: 'alice', skipped: ['retour'] })]),
    )
    expect(offers.map((offer) => offer.childId)).toEqual(['chloe'])
  })

  it('marque la permanence déjà choisie', () => {
    const offers = permanenceOffers(
      timetable(),
      MONDAY_A,
      ORDER,
      daysMap([childDay({ date: MONDAY_A, childId: 'alice', permanence: '17:00' })]),
    )
    expect(offers[0]).toMatchObject({ childId: 'alice', exitTime: '17:00', active: true })
  })

  it("suit la sortie réelle d'un autre enfant resté en permanence", () => {
    const table = timetable({ eveningBuses: [] })
    const offers = permanenceOffers(
      table,
      THURSDAY,
      ORDER,
      daysMap([childDay({ date: THURSDAY, childId: 'chloe', permanence: '17:00' })]),
    )
    expect(
      offers.filter((offer) => offer.childId === 'alice').map((offer) => offer.exitTime),
    ).toEqual(['17:00'])
  })
})
