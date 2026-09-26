import { describe, expect, it } from 'vitest'
import {
  dayLongLabel,
  dayNumber,
  dayShortLabel,
  presenceLabel,
  recapLabel,
  recapPercent,
  skipNote,
  statusLabel,
  weekRangeLabel,
} from './planningLabels'

describe('weekRangeLabel', () => {
  it('écrit la période du lundi au vendredi, sur deux mois', () => {
    expect(weekRangeLabel('2026-09-28')).toBe('28 septembre – 2 octobre')
  })

  it("n'écrit le mois qu'une fois quand la semaine tient dans un mois", () => {
    expect(weekRangeLabel('2026-10-05')).toBe('5 – 9 octobre')
  })
})

describe('jours', () => {
  it('nomme les jours en court et en long', () => {
    expect(dayShortLabel('mon')).toBe('Lun')
    expect(dayShortLabel('fri')).toBe('Ven')
    expect(dayLongLabel('wed')).toBe('mercredi')
  })

  it('rend le numéro du jour sans zéro initial', () => {
    expect(dayNumber('2026-10-05')).toBe(5)
  })
})

describe('presenceLabel', () => {
  it('rend le prénom seul pour un enfant présent', () => {
    expect(presenceLabel('Alice', 'female', 'present')).toBe('Alice')
  })

  it("accorde l'absence au genre de l'enfant", () => {
    expect(presenceLabel('Alice', 'female', 'absent')).toBe('Alice · absente')
    expect(presenceLabel('Basile', 'male', 'absent')).toBe('Basile · absent')
  })

  it('signale un enfant au collège sans covoiturage', () => {
    expect(presenceLabel('Basile', 'male', 'sansCovoiturage')).toBe('Basile · sans covoiturage')
  })
})

describe('skipNote', () => {
  it('ne dit rien sans enfant retiré', () => {
    expect(skipNote([])).toBe('')
  })

  it('nomme un, deux ou trois enfants retirés', () => {
    expect(skipNote(['Alice'])).toBe('Sans Alice sur ce trajet')
    expect(skipNote(['Alice', 'Basile'])).toBe('Sans Alice et Basile sur ce trajet')
    expect(skipNote(['Alice', 'Basile', 'Chloé'])).toBe('Sans Alice, Basile et Chloé sur ce trajet')
  })
})

describe('statusLabel', () => {
  it('reprend les textes du prototype', () => {
    expect(statusLabel({ kind: 'open' })).toBe("Personne pour l'instant")
    expect(statusLabel({ kind: 'mine' })).toBe('Vous')
    expect(statusLabel({ kind: 'covered', driverName: 'Paul', replacedYou: false })).toBe('Paul')
    expect(statusLabel({ kind: 'covered', driverName: 'Paul', replacedYou: true })).toBe(
      'Paul a pris votre place',
    )
    expect(statusLabel({ kind: 'void', driverName: null, mine: false })).toBe(
      'Personne à transporter',
    )
  })

  it('rappelle qui conduit encore un trajet vidé de ses passagers', () => {
    expect(statusLabel({ kind: 'void', driverName: 'Paul', mine: false })).toBe(
      'Personne à transporter · Paul conduit encore',
    )
    expect(statusLabel({ kind: 'void', driverName: 'Léa', mine: true })).toBe(
      'Personne à transporter · vous conduisez encore',
    )
  })
})

describe('récapitulatif', () => {
  it('compte les trajets couverts, avec les accords', () => {
    expect(recapLabel({ covered: 4, total: 15 }, 'la semaine prochaine')).toBe(
      '4 trajets sur 15 couverts la semaine prochaine',
    )
    expect(recapLabel({ covered: 1, total: 15 }, 'cette semaine')).toBe(
      '1 trajet sur 15 couvert cette semaine',
    )
    expect(recapLabel({ covered: 0, total: 0 }, 'cette semaine')).toBe(
      'Aucun trajet à couvrir cette semaine',
    )
  })

  it("arrondit le pourcentage, et vaut 100 quand il n'y a rien à couvrir", () => {
    expect(recapPercent({ covered: 4, total: 15 })).toBe(27)
    expect(recapPercent({ covered: 0, total: 0 })).toBe(100)
  })
})
