import lint from '@commitlint/lint'
import load from '@commitlint/load'
import { describe, expect, it } from 'vitest'

/** Lints `message` with the repository's own commitlint configuration. */
async function check(message: string): Promise<boolean> {
  const config = await load({}, { cwd: process.cwd() })
  const result = await lint(message, config.rules, {
    parserOpts: config.parserPreset?.parserOpts as never,
  })
  return result.valid
}

describe('commitlint', () => {
  it.each([
    "feat: 🎸 se connecter par redirection, relayée par le domaine de l'application",
    "fix: prévoir une largeur de repli pour l'écran de démarrage sans dvh",
    'style: aligner la barre',
    'perf: mémoriser la semaine',
    'build: passer à vite 8',
    'feat!: changer le format des données',
    'chore(main): release 1.5.0',
  ])('accepte « %s »', async (message) => {
    expect(await check(message)).toBe(true)
  })

  it.each(['Feat: ajouter', 'feature: ajouter', 'ajouter un bouton', 'wip: essai'])(
    'refuse « %s »',
    async (message) => {
      expect(await check(message)).toBe(false)
    },
  )
})
