import { describe, expect, it } from 'vitest'
import {
  actionAccessibleLabel,
  actionLabel,
  dayButtonLabel,
  dayLongLabel,
  dayNumber,
  dayShortLabel,
  presenceLabel,
  recapLabel,
  recapPercent,
  skipNote,
  statusLabel,
  weekRangeLabel,
  writeFailureMessage,
  writeSuccessMessage,
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

describe('dayButtonLabel', () => {
  it('nomme le jour sans mention de couverture quand tout ne l’est pas', () => {
    expect(dayButtonLabel('wed', '2026-09-30', false)).toBe('mercredi 30')
  })

  it('ajoute la couverture en toutes lettres quand le jour est couvert', () => {
    expect(dayButtonLabel('mon', '2026-10-05', true)).toBe(
      'lundi 5, tous les trajets sont couverts',
    )
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
    expect(
      statusLabel({
        kind: 'covered',
        driverName: 'Paul',
        driverUid: 'uid-paul',
        replacedYou: false,
      }),
    ).toBe('Paul')
    expect(
      statusLabel({
        kind: 'covered',
        driverName: 'Paul',
        driverUid: 'uid-paul',
        replacedYou: true,
      }),
    ).toBe('Paul a pris votre place')
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

describe('actions', () => {
  it('reprend les libellés du prototype', () => {
    expect(actionLabel('take')).toBe('Je prends')
    expect(actionLabel('takeOver')).toBe('Je le prends')
    expect(actionLabel('cancel')).toBe('Annuler')
  })

  it('nomme le trajet dans le nom accessible, après le libellé visible', () => {
    expect(actionAccessibleLabel('take', '07:40', 'Maison → Centre-bourg')).toBe(
      'Je prends — trajet de 07:40, Maison → Centre-bourg',
    )
  })

  it('explique un conflit, un refus ou un échec en vouvoyant', () => {
    expect(writeFailureMessage({ status: 'alreadyTaken', driverName: 'Maud' })).toBe(
      'Maud a pris ce trajet juste avant vous.',
    )
    expect(writeFailureMessage({ status: 'refused' })).toBe(
      'Ce trajet ne peut plus être modifié. Rechargez la page pour voir son état actuel.',
    )
    expect(writeFailureMessage({ status: 'failed' })).toBe(
      'Enregistrement impossible. Vérifiez votre connexion internet, puis réessayez.',
    )
  })

  it('annonce le trajet pris, repris ou annulé pour les lecteurs d’écran', () => {
    expect(writeSuccessMessage('take', '07:40', 'Maison → Centre-bourg')).toBe(
      'Vous prenez le trajet de 07:40, Maison → Centre-bourg.',
    )
    expect(writeSuccessMessage('takeOver', '07:40', 'Maison → Centre-bourg')).toBe(
      'Vous reprenez le trajet de 07:40, Maison → Centre-bourg.',
    )
    expect(writeSuccessMessage('cancel', '07:40', 'Maison → Centre-bourg')).toBe(
      'Vous avez annulé le trajet de 07:40, Maison → Centre-bourg.',
    )
  })
})
