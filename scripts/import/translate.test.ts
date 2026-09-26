// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { type ImportFile, parseImportFile } from './schema'
import { toMemberDocs, toTimetableDoc } from './translate'

function parsed(raw: unknown = validImportFile()): ImportFile {
  const result = parseImportFile(raw)
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.file
}

describe('toTimetableDoc', () => {
  it('traduit le fichier vers le document timetables de la spec', () => {
    const doc = toTimetableDoc(parsed())
    expect(doc.validFrom).toBe('2026-09-01')
    expect(doc.eveningBuses).toEqual([
      { classEnd: '16:00', arrival: '16:55' },
      { classEnd: '17:00', arrival: '17:30' },
    ])
    expect(doc.children.basile).toEqual({
      firstName: 'Basile',
      feminine: false,
      colorSlot: 2,
      weeks: {
        A: {
          mon: { start: '08:25', end: '16:00' },
          tue: { start: '08:25', end: '17:00' },
          wed: { start: '08:25', end: '12:30' },
          thu: { start: '09:25', end: '17:00' },
          fri: { start: '08:25', end: '14:55' },
        },
        B: {
          mon: { start: '08:25', end: '16:00' },
          tue: { start: '08:25', end: '17:00' },
          wed: { start: '08:25', end: '12:30' },
          thu: { start: '09:25', end: '17:00' },
          fri: { start: '08:25', end: '14:55' },
        },
      },
    })
  })

  it("n'écrit ni le régime ni l'autorisation de sortie", () => {
    const serialized = JSON.stringify(toTimetableDoc(parsed()))
    expect(serialized).not.toContain('DPS')
    expect(serialized).not.toContain('cours assurés')
  })
})

describe('toMemberDocs', () => {
  it("produit une fiche par parent et par compte enfant, identifiée par l'adresse", () => {
    expect(toMemberDocs(parsed())).toEqual({
      'camille@exemple.fr': { firstName: 'Camille', role: 'parent', childIds: ['alice'] },
      'paul@exemple.fr': { firstName: 'Paul', role: 'parent', childIds: ['basile'] },
      'lea@exemple.fr': { firstName: 'Léa', role: 'parent', childIds: ['basile'] },
      'basile@exemple.fr': { firstName: 'Basile', role: 'child', childId: 'basile' },
    })
  })

  it('ne crée aucune fiche pour une famille sans parent inscrit', () => {
    const file = validImportFile()
    file.familles[0].parents = []
    expect(Object.keys(toMemberDocs(parsed(file)))).not.toContain('camille@exemple.fr')
  })

  it("réunit les enfants d'un parent présent dans deux familles, triés et sans doublon", () => {
    const file = validImportFile()
    file.familles[0].parents.push({ email: 'paul@exemple.fr', prenom: 'Paul' })
    file.familles[1].enfants.push('basile')
    expect(toMemberDocs(parsed(file))['paul@exemple.fr']).toEqual({
      firstName: 'Paul',
      role: 'parent',
      childIds: ['alice', 'basile'],
    })
  })
})
