import { describe, expect, it } from 'vitest'
import { decideCancel, decideTake, tripAction } from './actions'

describe('tripAction', () => {
  it('propose « Je prends » sur un trajet libre', () => {
    expect(tripAction({ kind: 'open' }, true)).toBe('take')
  })

  it('propose « Annuler » sur un trajet que je conduis', () => {
    expect(tripAction({ kind: 'mine' }, true)).toBe('cancel')
  })

  it("propose « Je le prends » sur le trajet d'un autre parent", () => {
    expect(
      tripAction(
        { kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: false },
        true,
      ),
    ).toBe('takeOver')
  })

  it("ne propose rien au conducteur qu'on vient de remplacer", () => {
    expect(
      tripAction(
        { kind: 'covered', driverName: 'Paul', driverUid: 'uid-paul', replacedYou: true },
        true,
      ),
    ).toBeNull()
  })

  it('propose « Annuler » sur un trajet vidé que je conduis encore, rien sinon', () => {
    expect(tripAction({ kind: 'void', driverName: 'Léa', mine: true }, true)).toBe('cancel')
    expect(tripAction({ kind: 'void', driverName: 'Paul', mine: false }, true)).toBeNull()
    expect(tripAction({ kind: 'void', driverName: null, mine: false }, true)).toBeNull()
  })

  it('ne propose rien quand le visiteur ne peut pas conduire ce jour-là', () => {
    expect(tripAction({ kind: 'open' }, false)).toBeNull()
    expect(tripAction({ kind: 'mine' }, false)).toBeNull()
  })
})

describe('decideTake', () => {
  it('écrit un trajet encore libre', () => {
    expect(decideTake(null, null, 'uid-sophie')).toEqual({ kind: 'write', replacedDriverUid: null })
  })

  it('refuse de prendre un trajet déjà pris par un autre, en nommant son conducteur', () => {
    expect(decideTake({ driverUid: 'uid-maud', driverName: 'Maud' }, null, 'uid-sophie')).toEqual({
      kind: 'conflict',
      driverName: 'Maud',
    })
  })

  it('reprend un trajet à son conducteur attendu', () => {
    expect(
      decideTake({ driverUid: 'uid-paul', driverName: 'Paul' }, 'uid-paul', 'uid-sophie'),
    ).toEqual({
      kind: 'write',
      replacedDriverUid: 'uid-paul',
    })
  })

  it("refuse de reprendre un trajet que quelqu'un d'autre a repris entre-temps", () => {
    expect(
      decideTake({ driverUid: 'uid-maud', driverName: 'Maud' }, 'uid-paul', 'uid-sophie'),
    ).toEqual({
      kind: 'conflict',
      driverName: 'Maud',
    })
  })

  it('prend simplement un trajet libéré entre-temps', () => {
    expect(decideTake(null, 'uid-paul', 'uid-sophie')).toEqual({
      kind: 'write',
      replacedDriverUid: null,
    })
  })

  it('ne signale aucun conflit quand le trajet affiché est déjà le sien (« Je prends » rejoué)', () => {
    expect(
      decideTake({ driverUid: 'uid-sophie', driverName: 'Sophie' }, null, 'uid-sophie'),
    ).toEqual({ kind: 'already' })
  })

  it('ne signale aucun conflit quand le visiteur a déjà repris ce trajet (« Je le prends » rejoué)', () => {
    expect(
      decideTake({ driverUid: 'uid-sophie', driverName: 'Sophie' }, 'uid-paul', 'uid-sophie'),
    ).toEqual({ kind: 'already' })
  })
})

describe('decideCancel', () => {
  it('supprime le trajet que je conduis', () => {
    expect(decideCancel({ driverUid: 'uid-sophie' }, 'uid-sophie')).toBe('delete')
  })

  it("ne fait rien quand le trajet a disparu ou qu'un autre l'a repris", () => {
    expect(decideCancel(null, 'uid-sophie')).toBe('nothing')
    expect(decideCancel({ driverUid: 'uid-maud' }, 'uid-sophie')).toBe('nothing')
  })
})
