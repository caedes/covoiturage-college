import { describe, expect, it } from 'vitest'
import { carpool, childDay, timetable } from '../test/planningFixtures'
import { toCarpool, toChildDay, toTimetable } from './documents'

describe('toTimetable', () => {
  it('lit une version complète', () => {
    expect(toTimetable(timetable())).toEqual(timetable())
  })

  it('écarte une version à laquelle il manque une semaine', () => {
    const broken = timetable()
    const alice: Record<string, unknown> = broken.children.alice?.weeks ?? {}
    delete alice.B
    expect(toTimetable(broken)).toBeNull()
  })

  it("écarte ce qui n'est pas un objet", () => {
    expect(toTimetable(undefined)).toBeNull()
  })
})

describe('toCarpool', () => {
  const base = carpool({ date: '2026-09-28', direction: 'retour', place: 'college', time: '16:00' })

  it('lit un covoiturage et ignore les champs techniques', () => {
    expect(toCarpool({ ...base, updatedAt: { seconds: 1 } })).toEqual(base)
  })

  it('garde le conducteur remplacé', () => {
    expect(toCarpool({ ...base, replacedDriverUid: 'uid-lea' })?.replacedDriverUid).toBe('uid-lea')
  })

  it('écarte un sens ou une heure hors format', () => {
    expect(toCarpool({ ...base, direction: 'ailleurs' })).toBeNull()
    expect(toCarpool({ ...base, time: '16h' })).toBeNull()
  })
})

describe('toChildDay', () => {
  it('lit les options de la journée', () => {
    const day = childDay({ date: '2026-09-28', childId: 'alice', presence: 'absent' })
    expect(toChildDay(day)).toEqual(day)
  })

  it('tient pour vide une liste de retraits absente', () => {
    expect(
      toChildDay({ date: '2026-09-28', childId: 'alice', presence: 'present' })?.skipped,
    ).toEqual([])
  })

  it('écarte une présence hors liste', () => {
    expect(
      toChildDay({ date: '2026-09-28', childId: 'alice', presence: 'malade', skipped: [] }),
    ).toBeNull()
  })
})
