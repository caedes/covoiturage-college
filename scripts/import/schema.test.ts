// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { parseImportFile } from './schema'

const BELLS = () => ({
  entrees: ['08:25', '09:25', '10:35', '11:35', '13:00', '14:00', '15:00', '16:05'],
  sorties: ['09:20', '10:20', '11:30', '12:30', '13:55', '14:55', '16:00', '17:00'],
})

function errorsOf(raw: unknown): string[] {
  const result = parseImportFile(raw)
  return result.ok ? [] : result.errors
}

describe('parseImportFile', () => {
  it('accepte un fichier complet', () => {
    expect(parseImportFile(validImportFile()).ok).toBe(true)
  })

  it("accepte l'exemple fictif versionné dans data/", () => {
    const example: unknown = JSON.parse(readFileSync('data/import.example.json', 'utf8'))
    expect(errorsOf(example)).toEqual([])
  })

  it('accepte les sonneries du collège', () => {
    const file = { ...validImportFile(), sonneries: BELLS() }
    expect(errorsOf(file)).toEqual([])
  })

  it('accepte un fichier sans sonneries', () => {
    expect('sonneries' in validImportFile()).toBe(false)
    expect(errorsOf(validImportFile())).toEqual([])
  })

  it("refuse des entrées qui ne sont pas dans l'ordre", () => {
    const file = { ...validImportFile(), sonneries: { ...BELLS(), entrees: ['09:25', '08:25'] } }
    expect(errorsOf(file)).toEqual([
      "sonneries.entrees : heures attendues dans l'ordre, sans doublon",
    ])
  })

  it('refuse deux sorties identiques', () => {
    const file = { ...validImportFile(), sonneries: { ...BELLS(), sorties: ['09:20', '09:20'] } }
    expect(errorsOf(file)).toEqual([
      "sonneries.sorties : heures attendues dans l'ordre, sans doublon",
    ])
  })

  it('refuse une liste de sorties vide', () => {
    const file = { ...validImportFile(), sonneries: { ...BELLS(), sorties: [] } }
    expect(errorsOf(file)).toHaveLength(1)
    expect(errorsOf(file)[0]).toMatch(/^sonneries\.sorties : /)
  })

  it("refuse une sonnerie au mauvais format, sans erreur d'ordre en plus", () => {
    const file = { ...validImportFile(), sonneries: { ...BELLS(), entrees: ['08:25', '10h35'] } }
    expect(errorsOf(file)).toEqual(['sonneries.entrees.1 : heure attendue au format HH:MM'])
  })

  it('passe les adresses en minuscules et sans espaces', () => {
    const file = validImportFile()
    file.familles[1].parents[0].email = '  Paul@Exemple.FR '
    const result = parseImportFile(file)
    expect(result.ok && result.file.familles[1].parents[0].email).toBe('paul@exemple.fr')
  })

  it("refuse une heure qui n'est pas au format HH:MM, en nommant le champ", () => {
    const file = validImportFile()
    file.enfants.alice.horaires.semaine_A.lundi.debut = '8:25'
    expect(errorsOf(file)).toEqual([
      'enfants.alice.horaires.semaine_A.lundi.debut : heure attendue au format HH:MM',
    ])
  })

  it('refuse une journée dont le début ne précède pas la fin', () => {
    const file = validImportFile()
    file.enfants.alice.horaires.semaine_B.mardi = { debut: '17:00', fin: '08:25' }
    expect(errorsOf(file)).toEqual([
      'enfants.alice.horaires.semaine_B.mardi.fin : debut doit précéder fin',
    ])
  })

  it('refuse une semaine à laquelle il manque un jour', () => {
    const file = validImportFile()
    const week: Record<string, unknown> = file.enfants.alice.horaires.semaine_A
    delete week.vendredi
    expect(
      errorsOf(file).some((error) => error.startsWith('enfants.alice.horaires.semaine_A.vendredi')),
    ).toBe(true)
  })

  it('refuse une clé inconnue, pour attraper les fautes de frappe', () => {
    const file: Record<string, unknown> = validImportFile()
    file.valablesDu = file.valableDu
    expect(errorsOf(file).length).toBeGreaterThan(0)
  })

  it('remonte toutes les erreurs du fichier en une fois', () => {
    const file = validImportFile()
    const alice: Record<string, unknown> = file.enfants.alice
    const basile: Record<string, unknown> = file.enfants.basile
    delete alice.genre
    delete basile.genre
    const errors = errorsOf(file)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/^enfants\.alice\.genre : /)
    expect(errors[1]).toMatch(/^enfants\.basile\.genre : /)
  })

  it("refuse un identifiant d'enfant avec majuscule ou tiret bas", () => {
    const file = validImportFile()
    const enfants: Record<string, unknown> = file.enfants
    enfants.Chloe_B = enfants.alice
    delete enfants.alice
    file.familles[0].enfants = ['Chloe_B']
    expect(errorsOf(file).some((error) => error.includes('minuscules, chiffres et tirets'))).toBe(
      true,
    )
  })

  it('refuse un genre autre que female ou male', () => {
    const file: { enfants: { alice: Record<string, unknown> } } = validImportFile()
    file.enfants.alice.genre = 'féminin'
    expect(errorsOf(file)[0]).toMatch(/^enfants\.alice\.genre : /)
  })

  it('refuse deux enfants de la même couleur', () => {
    const file = validImportFile()
    file.enfants.basile.couleur = 1
    expect(errorsOf(file)).toEqual(['enfants.basile.couleur : couleur déjà prise par alice'])
  })

  it('refuse une couleur hors de 1 à 3', () => {
    const file = validImportFile()
    file.enfants.basile.couleur = 4
    expect(errorsOf(file)[0]).toMatch(/^enfants\.basile\.couleur : /)
  })

  it('accepte une famille sans parent inscrit, en période de test', () => {
    const file = validImportFile()
    file.familles[0].parents = []
    expect(errorsOf(file)).toEqual([])
  })

  it('refuse une famille qui cite un enfant inconnu', () => {
    const file = validImportFile()
    file.familles[0].enfants = ['alice', 'zoe']
    expect(errorsOf(file)).toEqual(['familles.0.enfants.1 : enfant inconnu : zoe'])
  })

  it('refuse un enfant rattaché à aucune famille', () => {
    const file = validImportFile()
    file.familles = [file.familles[1]]
    expect(errorsOf(file)).toEqual(['enfants.alice : enfant rattaché à aucune famille'])
  })

  it('refuse un parent qui porte deux prénoms différents', () => {
    const file = validImportFile()
    file.familles[0].parents.push({ email: 'paul@exemple.fr', prenom: 'Paolo' })
    expect(errorsOf(file)).toEqual([
      'familles.1.parents.0.prenom : paul@exemple.fr porte déjà le prénom Paolo',
    ])
  })

  it("refuse une adresse d'enfant déjà utilisée par un parent", () => {
    const file = validImportFile()
    file.enfants.basile.email = 'PAUL@exemple.fr'
    expect(errorsOf(file)).toEqual([
      'enfants.basile.email : paul@exemple.fr est déjà utilisée par un autre membre',
    ])
  })

  it('refuse deux bus du soir pour la même sortie', () => {
    const file = validImportFile()
    file.busDuSoir.push({ sortie: '16:00', arriveeCentreBourg: '17:10' })
    expect(errorsOf(file)).toEqual(['busDuSoir.2.sortie : deux bus pour la sortie de 16:00'])
  })

  it('refuse un bus qui arrive avant la sortie des cours', () => {
    const file = validImportFile()
    file.busDuSoir[0].arriveeCentreBourg = '15:30'
    expect(errorsOf(file)).toEqual([
      'busDuSoir.0.arriveeCentreBourg : arriveeCentreBourg doit suivre sortie',
    ])
  })

  it('refuse un valableDu qui n’est pas une date AAAA-MM-JJ', () => {
    const file = validImportFile()
    file.valableDu = '01/09/2026'
    expect(errorsOf(file)[0]).toMatch(/^valableDu : /)
  })

  it("refuse autre chose qu'un objet", () => {
    expect(errorsOf([])[0]).toMatch(/^\(racine\) : /)
  })
})
