import { describe, expect, it } from 'vitest'
import { carpool, childDay, timetable, VIEWER } from '../test/planningFixtures'
import { ZONE_A_2026_2027 } from './holidays'
import type { BuildWeekInput } from './week'
import { buildWeek } from './week'

const MONDAY_A = '2026-09-28'

function input(overrides: Partial<BuildWeekInput> = {}): BuildWeekInput {
  return {
    monday: MONDAY_A,
    today: '2026-09-28',
    timetables: [timetable()],
    carpools: [],
    childDays: [],
    viewerUid: VIEWER,
    holidays: ZONE_A_2026_2027,
    ...overrides,
  }
}

describe('buildWeek', () => {
  it('rend les cinq jours de classe avec leur nom et leur type de semaine', () => {
    const week = buildWeek(input())
    expect(week.monday).toBe(MONDAY_A)
    expect(week.days.map((day) => [day.date, day.weekday, day.weekType])).toEqual([
      ['2026-09-28', 'mon', 'A'],
      ['2026-09-29', 'tue', 'A'],
      ['2026-09-30', 'wed', 'A'],
      ['2026-10-01', 'thu', 'A'],
      ['2026-10-02', 'fri', 'A'],
    ])
  })

  it('verrouille les jours passés, pas aujourd’hui', () => {
    const week = buildWeek(input({ today: '2026-09-30' }))
    expect(week.days.map((day) => day.locked)).toEqual([true, true, false, false, false])
  })

  it('sépare les trajets Aller et Retour, avec leur statut', () => {
    const monday = buildWeek(input()).days[0]
    expect(monday?.aller.map((trip) => [trip.key, trip.status.kind])).toEqual([
      ['2026-09-28_aller_centre-bourg_0740', 'open'],
    ])
    expect(monday?.retour.map((trip) => trip.key)).toEqual([
      '2026-09-28_retour_college_1600',
      '2026-09-28_retour_centre-bourg_1745',
    ])
  })

  it('associe chaque covoiturage à son trajet, et compte les trajets couverts', () => {
    const week = buildWeek(
      input({
        carpools: [
          carpool({
            date: MONDAY_A,
            direction: 'aller',
            place: 'centre-bourg',
            time: '07:40',
            driverUid: VIEWER,
          }),
          carpool({ date: MONDAY_A, direction: 'retour', place: 'college', time: '16:00' }),
          carpool({ date: '2026-10-05', direction: 'aller', place: 'centre-bourg', time: '07:40' }),
        ],
      }),
    )
    const monday = week.days[0]
    expect(monday?.aller[0]?.status).toEqual({ kind: 'mine' })
    expect(monday?.retour[0]?.status).toMatchObject({ kind: 'covered', driverName: 'Paul' })
    expect(monday?.covered).toBe(false)
    expect(week.recap).toEqual({ covered: 2, total: 15 })
  })

  it('marque un jour couvert quand tous ses trajets ont un conducteur', () => {
    const wednesday = buildWeek(
      input({
        carpools: [
          carpool({ date: '2026-09-30', direction: 'aller', place: 'centre-bourg', time: '07:40' }),
          carpool({ date: '2026-09-30', direction: 'retour', place: 'college', time: '13:15' }),
        ],
      }),
    ).days[2]
    expect(wednesday?.covered).toBe(true)
  })

  it('sort du récapitulatif les trajets sans passager', () => {
    const everyoneAway = ['alice', 'basile', 'chloe'].map((childId) =>
      childDay({ date: '2026-09-30', childId, presence: 'absent' }),
    )
    const week = buildWeek(input({ childDays: everyoneAway }))
    expect(week.days[2]?.aller[0]?.status).toEqual({ kind: 'void', driverName: null })
    expect(week.days[2]?.covered).toBe(false)
    expect(week.recap.total).toBe(13)
  })

  it('garde visible, sans passager, le covoiturage dont le seul enfant est parti en permanence', () => {
    const week = buildWeek(
      input({
        carpools: [
          carpool({ date: '2026-10-01', direction: 'retour', place: 'college', time: '14:55' }),
        ],
        childDays: [childDay({ date: '2026-10-01', childId: 'alice', permanence: '16:00' })],
      }),
    )
    const orphan = week.days[3]?.retour.find(
      (trip) => trip.key === '2026-10-01_retour_college_1455',
    )
    expect(orphan).toMatchObject({
      label: 'Collège → Maison',
      riders: [],
      status: { kind: 'void', driverName: 'Paul' },
    })
    expect(week.recap.total).toBe(14)
  })

  it('joint les offres de permanence du jour', () => {
    const monday = buildWeek(input()).days[0]
    expect(monday?.offers.map((offer) => [offer.childId, offer.exitTime])).toEqual([
      ['alice', '17:00'],
      ['chloe', '17:00'],
    ])
  })

  it('vide les jours de vacances et les sort du récapitulatif', () => {
    const week = buildWeek(input({ monday: '2026-10-19', today: '2026-10-19' }))
    expect(
      week.days.every((day) => day.holiday && day.aller.length === 0 && day.retour.length === 0),
    ).toBe(true)
    expect(week.days.every((day) => !day.covered)).toBe(true)
    expect(week.recap).toEqual({ covered: 0, total: 0 })
  })

  it('ne vide que le jour férié dans une semaine de classe', () => {
    const week = buildWeek(input({ monday: '2026-11-09', today: '2026-11-09' }))
    expect(week.days.map((day) => day.holiday)).toEqual([false, false, true, false, false])
  })

  it("rend des jours vides, non couverts, avant la première version de l'emploi du temps", () => {
    const week = buildWeek(input({ timetables: [timetable({ validFrom: '2026-10-01' })] }))
    expect(week.days.slice(0, 3).every((day) => day.aller.length === 0 && !day.covered)).toBe(true)
    expect(week.days[3]?.aller).toHaveLength(1)
  })

  it('applique les options de la journée au bon enfant et au bon jour', () => {
    const week = buildWeek(
      input({
        childDays: [childDay({ date: '2026-09-29', childId: 'chloe', presence: 'absent' })],
      }),
    )
    expect(week.days[0]?.aller[0]?.riders).toEqual(['alice', 'basile', 'chloe'])
    expect(week.days[1]?.aller[0]?.riders).toEqual(['alice', 'basile'])
  })
})
