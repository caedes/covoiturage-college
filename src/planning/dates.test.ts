import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayIndex,
  displayedMonday,
  initialDay,
  mondayOf,
  parisToday,
  schoolDays,
  weekdayOf,
  weekType,
} from './dates'

describe('parisToday', () => {
  it('rend la date du jour à Paris au format AAAA-MM-JJ', () => {
    expect(parisToday(new Date('2026-09-27T10:00:00Z'))).toBe('2026-09-27')
  })

  it("passe au lendemain à minuit heure de Paris, quand l'UTC est encore la veille", () => {
    expect(parisToday(new Date('2026-09-26T22:30:00Z'))).toBe('2026-09-27')
  })

  it("suit l'heure d'hiver", () => {
    expect(parisToday(new Date('2027-01-14T22:59:00Z'))).toBe('2027-01-14')
    expect(parisToday(new Date('2027-01-14T23:00:00Z'))).toBe('2027-01-15')
  })
})

describe('addDays', () => {
  it('avance et recule de quelques jours', () => {
    expect(addDays('2026-09-28', 4)).toBe('2026-10-02')
    expect(addDays('2026-09-28', -7)).toBe('2026-09-21')
  })

  it("franchit les fins de mois et d'année", () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it("ignore le passage à l'heure d'hiver du 25 octobre", () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
})

describe('jours de la semaine', () => {
  it('numérote les jours du lundi (0) au dimanche (6)', () => {
    expect(dayIndex('2026-09-28')).toBe(0)
    expect(dayIndex('2026-10-04')).toBe(6)
  })

  it('nomme les jours de classe et rien le week-end', () => {
    expect(weekdayOf('2026-09-28')).toBe('mon')
    expect(weekdayOf('2026-09-30')).toBe('wed')
    expect(weekdayOf('2026-10-02')).toBe('fri')
    expect(weekdayOf('2026-10-03')).toBeNull()
    expect(weekdayOf('2026-10-04')).toBeNull()
  })

  it('trouve le lundi de la semaine, dimanche compris', () => {
    expect(mondayOf('2026-10-01')).toBe('2026-09-28')
    expect(mondayOf('2026-10-04')).toBe('2026-09-28')
    expect(mondayOf('2026-09-28')).toBe('2026-09-28')
  })

  it('liste les cinq jours de classe à partir du lundi', () => {
    expect(schoolDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ])
  })
})

describe('weekType', () => {
  it('fait de la semaine du 21 septembre 2026 une semaine B, puis alterne', () => {
    expect(weekType('2026-09-21')).toBe('B')
    expect(weekType('2026-09-28')).toBe('A')
    expect(weekType('2026-10-05')).toBe('B')
  })

  it('donne le même type à tous les jours de la semaine', () => {
    expect(weekType('2026-10-01')).toBe('A')
    expect(weekType('2026-10-04')).toBe('A')
  })

  it("continue l'alternance pendant les vacances et après le changement d'heure", () => {
    expect(weekType('2026-10-19')).toBe('B')
    expect(weekType('2026-10-26')).toBe('A')
    expect(weekType('2027-01-04')).toBe('A')
  })

  it('vaut aussi avant la semaine de référence', () => {
    expect(weekType('2026-09-14')).toBe('A')
    expect(weekType('2026-09-07')).toBe('B')
  })
})

describe('semaine affichée', () => {
  it('reste sur la semaine en cours du lundi au vendredi', () => {
    expect(displayedMonday('2026-09-28')).toBe('2026-09-28')
    expect(displayedMonday('2026-10-02')).toBe('2026-09-28')
  })

  it('bascule sur la semaine qui arrive le samedi et le dimanche', () => {
    expect(displayedMonday('2026-10-03')).toBe('2026-10-05')
    expect(displayedMonday('2026-10-04')).toBe('2026-10-05')
  })

  it("sélectionne aujourd'hui en semaine, et le lundi qui arrive le week-end", () => {
    expect(initialDay('2026-09-30')).toBe('2026-09-30')
    expect(initialDay('2026-10-04')).toBe('2026-10-05')
  })
})
