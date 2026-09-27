import { describe, expect, it } from 'vitest'
import { childDay } from '../test/planningFixtures'
import { childDayKey, togglePermanence, toggleSkipped, withPresence } from './childOptions'

const DATE = '2026-10-01'

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
    expect(day).toEqual({ date: DATE, childId: 'alice', presence: 'present', skipped: [] })
    expect(day).not.toHaveProperty('permanence')
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
    const day = childDay({ date: DATE, childId: 'basile', skipped: ['aller', 'retour'] })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['retour'])
  })

  it("range les sens dans l'ordre Aller, Retour", () => {
    const day = childDay({ date: DATE, childId: 'basile', skipped: ['retour'] })
    expect(toggleSkipped(day, DATE, 'basile', 'aller').skipped).toEqual(['aller', 'retour'])
  })

  it("efface la permanence de l'enfant retiré du Retour : il a une autre solution pour rentrer", () => {
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00' })
    const next = toggleSkipped(day, DATE, 'alice', 'retour')
    expect(next).toEqual({ date: DATE, childId: 'alice', presence: 'present', skipped: ['retour'] })
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
    const day = childDay({ date: DATE, childId: 'alice', permanence: '16:00', skipped: ['aller'] })
    const next = togglePermanence(day, DATE, 'alice', '16:00')
    expect(next).toEqual({ date: DATE, childId: 'alice', presence: 'present', skipped: ['aller'] })
    expect(next).not.toHaveProperty('permanence')
  })
})
