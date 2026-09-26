import { describe, expect, it } from 'vitest'
import { carpool, VIEWER } from '../test/planningFixtures'
import { resolveStatus } from './status'
import type { Trip } from './types'

const TRIP: Trip = {
  key: '2026-09-28_retour_college_1600',
  date: '2026-09-28',
  direction: 'retour',
  place: 'college',
  mode: 'car',
  time: '16:00',
  label: 'Collège → Maison',
  riders: ['alice'],
  excluded: [],
}
const EMPTY: Trip = { ...TRIP, riders: [], excluded: [{ childId: 'alice', reason: 'absent' }] }
const COVER = carpool({ date: '2026-09-28', direction: 'retour', place: 'college', time: '16:00' })

describe('resolveStatus', () => {
  it('rend « Personne à transporter » sans passager', () => {
    expect(resolveStatus(EMPTY, undefined, VIEWER)).toEqual({ kind: 'void', driverName: null })
  })

  it('garde le conducteur d’un trajet vidé de ses passagers', () => {
    expect(resolveStatus(EMPTY, COVER, VIEWER)).toEqual({ kind: 'void', driverName: 'Paul' })
  })

  it('rend « Personne pour l’instant » sans covoiturage', () => {
    expect(resolveStatus(TRIP, undefined, VIEWER)).toEqual({ kind: 'open' })
  })

  it('rend « Vous » quand je conduis', () => {
    expect(resolveStatus(TRIP, { ...COVER, driverUid: VIEWER }, VIEWER)).toEqual({ kind: 'mine' })
  })

  it('rend le prénom du conducteur', () => {
    expect(resolveStatus(TRIP, COVER, VIEWER)).toEqual({
      kind: 'covered',
      driverName: 'Paul',
      replacedYou: false,
    })
  })

  it('signale au conducteur remplacé qu’on a pris sa place', () => {
    expect(resolveStatus(TRIP, { ...COVER, replacedDriverUid: VIEWER }, VIEWER)).toEqual({
      kind: 'covered',
      driverName: 'Paul',
      replacedYou: true,
    })
  })
})
