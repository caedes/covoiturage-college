import { describe, expect, it } from 'vitest'
import { childDay } from '../test/planningFixtures'
import {
  childDayKey,
  togglePermanence,
  toggleSkipped,
  withHours,
  withPresence,
} from './childOptions'

const DATE = '2026-10-01'
const USUAL = { start: '08:25', end: '16:00' }

describe('childDayKey', () => {
  it("forme l'identifiant du document childDays", () => {
    expect(childDayKey(DATE, 'basile')).toBe('2026-10-01_basile')
  })
})

describe('withPresence', () => {
  it('règle la présence sans garder aucun autre réglage', () => {
    expect(withPresence(DATE, 'alice', 'absent')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'absent',
      skipped: [],
    })
  })

  it('ne garde ni retrait ni permanence au retour à « covoiturage normal »', () => {
    const day = withPresence(DATE, 'alice', 'present')
    expect(day).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: [],
    })
    expect(day).not.toHaveProperty('permanence')
  })

  it('ne garde pas les horaires modifiés', () => {
    const day = withPresence(DATE, 'alice', 'present')
    expect(day).not.toHaveProperty('start')
    expect(day).not.toHaveProperty('end')
  })
})

describe('withHours', () => {
  it("règle la sortie quand aucune option n'existe encore", () => {
    const day = withHours(undefined, DATE, 'alice', { end: '12:30' }, USUAL)
    expect(day).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: [],
      end: '12:30',
    })
    expect(day).not.toHaveProperty('start')
  })

  it('remet présent un enfant absent', () => {
    const day = childDay({ date: DATE, childId: 'alice', presence: 'absent' })
    expect(withHours(day, DATE, 'alice', { end: '12:30' }, USUAL).presence).toBe('present')
  })

  it('garde les trajets retirés', () => {
    const day = childDay({ date: DATE, childId: 'alice', skipped: ['aller'] })
    expect(withHours(day, DATE, 'alice', { end: '12:30' }, USUAL).skipped).toEqual(['aller'])
  })

  it("garde l'entrée quand on change la sortie", () => {
    const day = childDay({ date: DATE, childId: 'alice', start: '10:35' })
    const next = withHours(day, DATE, 'alice', { end: '12:30' }, USUAL)
    expect(next.start).toBe('10:35')
    expect(next.end).toBe('12:30')
  })

  it("omet le champ quand l'heure choisie est l'habituelle", () => {
    const day = childDay({ date: DATE, childId: 'alice', end: '12:30' })
    const next = withHours(day, DATE, 'alice', { end: '16:00' }, USUAL)
    expect(next).not.toHaveProperty('end')
    const early = childDay({ date: DATE, childId: 'alice', start: '10:35' })
    expect(withHours(early, DATE, 'alice', { start: '08:25' }, USUAL)).not.toHaveProperty('start')
  })

  it('efface la permanence quand la sortie change', () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '17:00' })
    expect(withHours(day, DATE, 'alice', { end: '12:30' }, USUAL)).not.toHaveProperty('permanence')
  })

  it("garde la permanence quand l'entrée change", () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '17:00' })
    expect(withHours(day, DATE, 'alice', { start: '10:35' }, USUAL).permanence).toBe('17:00')
  })

  it("remet la sortie à l'habituelle quand la nouvelle entrée la dépasse", () => {
    const day = childDay({ date: DATE, childId: 'alice', end: '12:30' })
    const next = withHours(day, DATE, 'alice', { start: '14:00' }, USUAL)
    expect(next.start).toBe('14:00')
    expect(next).not.toHaveProperty('end')
  })

  it("remet l'entrée à l'habituelle quand la nouvelle sortie la précède", () => {
    const day = childDay({ date: DATE, childId: 'alice', start: '14:00' })
    const next = withHours(day, DATE, 'alice', { end: '12:30' }, USUAL)
    expect(next.end).toBe('12:30')
    expect(next).not.toHaveProperty('start')
  })
})

describe('toggleSkipped', () => {
  it("retire l'enfant d'un sens quand aucune option n'existe encore", () => {
    expect(toggleSkipped(undefined, DATE, 'basile', 'aller')).toEqual({
      date: DATE,
      childId: 'basile',
      presence: 'present',
      skipped: ['aller'],
    })
  })

  it("remet l'enfant sur le trajet au second appui", () => {
    const day = childDay({
      date: DATE,
      childId: 'basile',
      skipped: ['aller', 'retour'],
    })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['retour'])
  })

  it("range les sens dans l'ordre Aller, Retour", () => {
    const day = childDay({
      date: DATE,
      childId: 'basile',
      skipped: ['retour'],
    })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['aller', 'retour'])
  })

  it("efface la permanence de l'enfant retiré du Retour : il a une autre solution pour rentrer", () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    const next = toggleSkipped(day, DATE, 'alice', 'retour')
    expect(next).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: ['retour'],
    })
    expect(next).not.toHaveProperty('permanence')
  })

  it("garde la permanence de l'enfant retiré de l'Aller, qui ne concerne que le Retour", () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    expect(toggleSkipped(day, DATE, 'alice', 'aller')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      permanence: '16:00',
      skipped: ['aller'],
    })
  })
})

describe('togglePermanence', () => {
  it('choisit la sortie plus tardive', () => {
    expect(togglePermanence(undefined, DATE, 'alice', '16:00')).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: [],
      permanence: '16:00',
    })
  })

  it('remplace une permanence par une autre', () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    expect(togglePermanence(day, DATE, 'alice', '17:00').permanence).toBe('17:00')
  })

  it('revient à la fin des cours au second appui, sans champ vide', () => {
    const day = childDay({
      date: DATE,
      childId: 'alice',
      permanence: '16:00',
      skipped: ['aller'],
    })
    const next = togglePermanence(day, DATE, 'alice', '16:00')
    expect(next).toEqual({
      date: DATE,
      childId: 'alice',
      presence: 'present',
      skipped: ['aller'],
    })
    expect(next).not.toHaveProperty('permanence')
  })
})

describe('les horaires modifiés traversent les autres options', () => {
  it("toggleSkipped garde l'entrée et la sortie", () => {
    const day = childDay({
      date: DATE,
      childId: 'alice',
      start: '10:35',
      end: '12:30',
    })
    const next = toggleSkipped(day, DATE, 'alice', 'aller')
    expect(next.start).toBe('10:35')
    expect(next.end).toBe('12:30')
  })

  it("toggleSkipped n'écrit pas de champ vide", () => {
    const next = toggleSkipped(undefined, DATE, 'alice', 'aller')
    expect(next).not.toHaveProperty('start')
    expect(next).not.toHaveProperty('end')
  })

  it("togglePermanence garde l'entrée et la sortie à la pose", () => {
    const day = childDay({
      date: DATE,
      childId: 'alice',
      start: '10:35',
      end: '12:30',
    })
    const next = togglePermanence(day, DATE, 'alice', '17:00')
    expect(next.start).toBe('10:35')
    expect(next.end).toBe('12:30')
  })

  it("togglePermanence garde l'entrée et la sortie au retrait", () => {
    const day = childDay({
      date: DATE,
      childId: 'alice',
      permanence: '17:00',
      start: '10:35',
      end: '12:30',
    })
    const next = togglePermanence(day, DATE, 'alice', '17:00')
    expect(next).not.toHaveProperty('permanence')
    expect(next.start).toBe('10:35')
    expect(next.end).toBe('12:30')
  })
})
