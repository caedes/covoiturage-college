import { describe, expect, it } from 'vitest'
import { BELL_TIMES, childDay, timetable } from '../test/planningFixtures'
import {
  applyChildDay,
  defaultLegs,
  effectiveExit,
  retourPlacement,
  scheduledSlot,
  timetableFor,
} from './legs'

const MONDAY_A = '2026-09-28'
const WEDNESDAY = '2026-09-30'
const THURSDAY = '2026-10-01'
const MONDAY_B = '2026-10-05'

describe('timetableFor', () => {
  const autumn = timetable({ validFrom: '2026-09-01' })
  const winter = timetable({ validFrom: '2027-01-04' })

  it('prend la version la plus récente déjà en vigueur, quel que soit l’ordre reçu', () => {
    expect(timetableFor('2026-12-18', [winter, autumn])).toBe(autumn)
    expect(timetableFor('2027-01-04', [winter, autumn])).toBe(winter)
  })

  it('ne rend rien avant la première version', () => {
    expect(timetableFor('2026-08-31', [autumn, winter])).toBeNull()
  })
})

describe('defaultLegs', () => {
  const table = timetable()

  it('emmène tout le monde au bus à 07:40, même pour une entrée à 09:25', () => {
    expect(defaultLegs(table, 'basile', '2026-09-29')[0]).toEqual({
      childId: 'basile',
      direction: 'aller',
      place: 'centre-bourg',
      time: '07:40',
      exclusion: null,
    })
  })

  it('ramène en voiture depuis le collège à la sortie quand aucun bus ne correspond', () => {
    expect(defaultLegs(table, 'alice', MONDAY_A)[1]).toEqual({
      childId: 'alice',
      direction: 'retour',
      place: 'college',
      time: '16:00',
      exclusion: null,
    })
  })

  it('récupère au Centre-bourg à l’arrivée du bus quand la sortie correspond à un bus', () => {
    expect(defaultLegs(table, 'basile', MONDAY_A)[1]).toMatchObject({
      place: 'centre-bourg',
      time: '17:45',
    })
  })

  it('ramène tout le monde à 13:15 depuis le collège le mercredi, quelle que soit la sortie', () => {
    for (const child of ['alice', 'basile']) {
      expect(defaultLegs(table, child, WEDNESDAY)[1]).toMatchObject({
        place: 'college',
        time: '13:15',
      })
    }
  })

  it('suit la semaine B', () => {
    expect(defaultLegs(table, 'alice', MONDAY_B)[1]).toMatchObject({
      place: 'centre-bourg',
      time: '17:45',
    })
  })

  it("ne rend rien le week-end ni pour un enfant absent de l'emploi du temps", () => {
    expect(defaultLegs(table, 'alice', '2026-10-03')).toEqual([])
    expect(defaultLegs(table, 'zoe', MONDAY_A)).toEqual([])
  })
})

describe('applyChildDay', () => {
  const table = timetable()
  const legsOf = (child: string, date: string, day?: Parameters<typeof applyChildDay>[3]) =>
    applyChildDay(table, date, defaultLegs(table, child, date), day)

  it('laisse les trajets intacts sans options pour la journée', () => {
    expect(legsOf('alice', MONDAY_A)).toEqual(defaultLegs(table, 'alice', MONDAY_A))
  })

  it("retire l'enfant absent des deux sens, sans effacer ses trajets", () => {
    const legs = legsOf(
      'alice',
      MONDAY_A,
      childDay({ date: MONDAY_A, childId: 'alice', presence: 'absent' }),
    )
    expect(legs.map((leg) => leg.exclusion)).toEqual(['absent', 'absent'])
  })

  it("retire l'enfant au collège sans covoiturage des deux sens", () => {
    const legs = legsOf(
      'alice',
      MONDAY_A,
      childDay({ date: MONDAY_A, childId: 'alice', presence: 'sansCovoiturage' }),
    )
    expect(legs.map((leg) => leg.exclusion)).toEqual(['sansCovoiturage', 'sansCovoiturage'])
  })

  it("ne retire l'enfant que du sens décoché", () => {
    const legs = legsOf(
      'alice',
      MONDAY_A,
      childDay({ date: MONDAY_A, childId: 'alice', skipped: ['aller'] }),
    )
    expect(legs.map((leg) => leg.exclusion)).toEqual(['skipped', null])
  })

  it('déplace le retour vers le bus quand la permanence mène à sa sortie', () => {
    const legs = legsOf(
      'alice',
      MONDAY_A,
      childDay({ date: MONDAY_A, childId: 'alice', permanence: '17:00' }),
    )
    expect(legs[1]).toMatchObject({ place: 'centre-bourg', time: '17:45', exclusion: null })
  })

  it('déplace le retour vers le collège à l’heure de permanence sans bus correspondant', () => {
    const legs = legsOf(
      'alice',
      THURSDAY,
      childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' }),
    )
    expect(legs[1]).toMatchObject({ place: 'college', time: '16:00' })
  })

  it.each([
    ['plus tôt que la sortie', MONDAY_A, '14:00'],
    ['égale à la sortie', MONDAY_A, '16:00'],
    ['mal formée', MONDAY_A, '17h'],
    ['un mercredi', WEDNESDAY, '17:00'],
  ])('ignore une permanence %s et garde le trajet par défaut', (_case, date, permanence) => {
    const legs = legsOf('alice', date, childDay({ date, childId: 'alice', permanence }))
    expect(legs).toEqual(defaultLegs(table, 'alice', date))
  })
})

describe('effectiveExit', () => {
  const table = timetable()

  it('rend la fin des cours, ou la permanence quand elle est valide', () => {
    expect(effectiveExit(table, 'alice', THURSDAY, undefined)).toBe('14:55')
    expect(
      effectiveExit(
        table,
        'alice',
        THURSDAY,
        childDay({ date: THURSDAY, childId: 'alice', permanence: '16:00' }),
      ),
    ).toBe('16:00')
    expect(
      effectiveExit(
        table,
        'alice',
        THURSDAY,
        childDay({ date: THURSDAY, childId: 'alice', permanence: '13:00' }),
      ),
    ).toBe('14:55')
  })

  it('ne rend rien le week-end', () => {
    expect(effectiveExit(table, 'alice', '2026-10-03', undefined)).toBeNull()
  })
})

describe('scheduledSlot', () => {
  const table = timetable({ bellTimes: BELL_TIMES })
  const usual = { start: '08:25', end: '16:00' }
  const slotWith = (fields: { start?: string; end?: string }, t = table) =>
    scheduledSlot(t, 'alice', MONDAY_A, childDay({ date: MONDAY_A, childId: 'alice', ...fields }))

  it("rend l'horaire habituel sans option", () => {
    expect(scheduledSlot(table, 'alice', MONDAY_A, undefined)).toEqual({
      usual,
      start: '08:25',
      end: '16:00',
    })
  })

  it('applique une sortie modifiée tombant sur une sonnerie', () => {
    expect(slotWith({ end: '12:30' })).toEqual({ usual, start: '08:25', end: '12:30' })
  })

  it('ignore une heure hors sonneries', () => {
    expect(slotWith({ end: '12:31' })?.end).toBe('16:00')
  })

  it("ignore les deux heures quand l'entrée dépasse la sortie", () => {
    expect(slotWith({ start: '14:00', end: '12:30' })).toEqual({
      usual,
      start: '08:25',
      end: '16:00',
    })
  })

  it('ignore les heures modifiées sans sonneries dans l’emploi du temps', () => {
    expect(slotWith({ end: '12:30' }, timetable())?.end).toBe('16:00')
  })

  it('ne rend rien le week-end', () => {
    expect(scheduledSlot(table, 'alice', '2026-10-03', undefined)).toBeNull()
  })
})

describe('applyChildDay avec des horaires modifiés', () => {
  const table = timetable({ bellTimes: BELL_TIMES })
  const retourOf = (child: string, date: string, fields: Parameters<typeof childDay>[0]) =>
    applyChildDay(table, date, defaultLegs(table, child, date), childDay(fields))

  it("place l'aller au collège à l'entrée modifiée", () => {
    const legs = retourOf('alice', MONDAY_A, { date: MONDAY_A, childId: 'alice', start: '10:35' })
    expect(legs[0]).toMatchObject({ direction: 'aller', place: 'college', time: '10:35' })
  })

  it("laisse l'aller inchangé quand l'entrée n'est pas plus tardive que l'habituelle", () => {
    const tuesday = '2026-09-29'
    const legs = retourOf('basile', tuesday, { date: tuesday, childId: 'basile', start: '08:25' })
    expect(legs[0]).toMatchObject({ place: 'centre-bourg', time: '07:40' })
  })

  it('place le retour au collège à la sortie modifiée', () => {
    const legs = retourOf('alice', MONDAY_A, { date: MONDAY_A, childId: 'alice', end: '12:30' })
    expect(legs[1]).toMatchObject({ direction: 'retour', place: 'college', time: '12:30' })
  })

  it('met le retour au bus quand la sortie modifiée est la fin du bus', () => {
    const legs = retourOf('alice', THURSDAY, { date: THURSDAY, childId: 'alice', end: '17:00' })
    expect(legs[1]).toMatchObject({ place: 'centre-bourg', time: '17:45' })
  })

  it('garde la permanence quand elle reste plus tardive', () => {
    const legs = retourOf('alice', MONDAY_A, {
      date: MONDAY_A,
      childId: 'alice',
      end: '16:00',
      permanence: '17:00',
    })
    expect(legs[1]).toMatchObject({ place: 'centre-bourg', time: '17:45' })
  })
})

describe('retourPlacement le mercredi', () => {
  const table = timetable()

  it('ramène au collège à la sortie quand elle précède 11:30', () => {
    expect(retourPlacement(table, WEDNESDAY, '10:20')).toEqual({ place: 'college', time: '10:20' })
  })

  it.each(['11:30', '12:30'])('ramène à 13:15 pour une sortie à %s', (exit) => {
    expect(retourPlacement(table, WEDNESDAY, exit)).toEqual({ place: 'college', time: '13:15' })
  })
})
