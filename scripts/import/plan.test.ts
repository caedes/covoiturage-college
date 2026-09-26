// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validImportFile } from './fixtures'
import { type ExistingState, type ImportOutcome, planImport } from './plan'

const EMPTY: ExistingState = { members: {}, timetables: {} }
const TODAY = '2026-09-27'

function succeeded(outcome: ImportOutcome) {
  if (!outcome.ok) {
    throw new Error(outcome.errors.join('\n'))
  }
  return outcome
}

/** The state Firestore holds once `raw` has been applied. */
function stateAfter(raw: unknown): ExistingState {
  const state: ExistingState = { members: {}, timetables: {} }
  for (const write of succeeded(planImport(raw, EMPTY, { today: TODAY, prune: false })).writes) {
    if (write.kind === 'set') {
      const [collection, id] = write.path.split('/')
      state[collection as 'members' | 'timetables'][id] = structuredClone(write.data)
    }
  }
  return state
}

describe('planImport', () => {
  it("rend les erreurs d'un fichier invalide sans aucune écriture", () => {
    const file = validImportFile()
    file.valableDu = 'demain'
    const outcome = planImport(file, EMPTY, { today: TODAY, prune: false })
    expect(outcome.ok).toBe(false)
    expect(outcome.ok ? [] : outcome.errors[0]).toMatch(/^valableDu : /)
  })

  it('crée tout au premier import, même avec une date passée', () => {
    const { writes, report } = succeeded(
      planImport(validImportFile(), EMPTY, { today: TODAY, prune: false }),
    )
    expect(writes.map((write) => write.path)).toEqual([
      'timetables/2026-09-01',
      'members/basile@exemple.fr',
      'members/camille@exemple.fr',
      'members/lea@exemple.fr',
      'members/paul@exemple.fr',
    ])
    expect(report).toContain('Emploi du temps 2026-09-01 : création')
    expect(report).toContain('  + camille@exemple.fr (parent de alice)')
    expect(report).toContain('  + basile@exemple.fr (compte enfant de basile)')
  })

  it("n'écrit rien quand le même fichier est relancé", () => {
    const { writes, report } = succeeded(
      planImport(validImportFile(), stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
    expect(report).toContain('Emploi du temps 2026-09-01 : inchangé')
    expect(report).toContain('  = 4 fiche(s) inchangée(s)')
  })

  it('ne voit aucun changement quand Firestore rend les clés dans un autre ordre', () => {
    const state = stateAfter(validImportFile())
    const timetable = state.timetables['2026-09-01'] as Record<string, unknown>
    state.timetables['2026-09-01'] = Object.fromEntries(Object.entries(timetable).reverse())
    const paul = state.members['paul@exemple.fr'] as Record<string, unknown>
    state.members['paul@exemple.fr'] = Object.fromEntries(Object.entries(paul).reverse())

    const { writes } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
  })

  it('refuse de réécrire une version déjà en vigueur', () => {
    const file = validImportFile()
    file.busDuSoir[1].arriveeCentreBourg = '17:40'
    const outcome = planImport(file, stateAfter(validImportFile()), {
      today: TODAY,
      prune: false,
    })
    expect(outcome).toEqual({
      ok: false,
      errors: [
        "La version 2026-09-01 de l'emploi du temps prend effet le 2026-09-27 ou avant : la modifier réécrirait des journées passées. Importer une nouvelle version avec un valableDu postérieur au 2026-09-27.",
      ],
    })
  })

  it("refuse de créer une version datée d'aujourd'hui quand une autre existe", () => {
    const file = validImportFile()
    file.valableDu = TODAY
    const outcome = planImport(file, stateAfter(validImportFile()), {
      today: TODAY,
      prune: false,
    })
    expect(outcome.ok).toBe(false)
  })

  it('crée une nouvelle version datée de demain à côté de celle en vigueur', () => {
    const file = validImportFile()
    file.valableDu = '2026-09-28'
    const { writes, report } = succeeded(
      planImport(file, stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes.map((write) => write.path)).toEqual(['timetables/2026-09-28'])
    expect(report).toContain('Emploi du temps 2026-09-28 : création')
  })

  it('remplace une version future pas encore en vigueur', () => {
    const future = validImportFile()
    future.valableDu = '2026-10-05'
    const state = stateAfter(future)
    future.busDuSoir[1].arriveeCentreBourg = '17:40'
    const { report } = succeeded(planImport(future, state, { today: TODAY, prune: false }))
    expect(report).toContain('Emploi du temps 2026-10-05 : remplacement')
  })

  it('signale une fiche modifiée', () => {
    const file = validImportFile()
    file.familles[1].parents[0].prenom = 'Paolo'
    const { writes, report } = succeeded(
      planImport(file, stateAfter(validImportFile()), { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([
      {
        kind: 'set',
        path: 'members/paul@exemple.fr',
        data: { firstName: 'Paolo', role: 'parent', childIds: ['basile'] },
      },
    ])
    expect(report).toContain('  ~ paul@exemple.fr (parent de basile)')
  })

  it('conserve et signale une fiche absente du fichier sans --prune', () => {
    const state = stateAfter(validImportFile())
    state.members['ancien@exemple.fr'] = { firstName: 'Ancien', role: 'parent', childIds: [] }
    const { writes, report } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: false }),
    )
    expect(writes).toEqual([])
    expect(report).toContain(
      '  ! ancien@exemple.fr absente du fichier, conservée (--prune pour la supprimer)',
    )
  })

  it('supprime une fiche absente du fichier avec --prune', () => {
    const state = stateAfter(validImportFile())
    state.members['ancien@exemple.fr'] = { firstName: 'Ancien', role: 'parent', childIds: [] }
    const { writes, report } = succeeded(
      planImport(validImportFile(), state, { today: TODAY, prune: true }),
    )
    expect(writes).toEqual([{ kind: 'delete', path: 'members/ancien@exemple.fr' }])
    expect(report).toContain('  - ancien@exemple.fr (supprimée)')
  })
})
