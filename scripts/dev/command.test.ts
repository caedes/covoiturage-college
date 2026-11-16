import { describe, expect, it } from 'vitest'
import {
  emulatorsExecArgs,
  isEmulatorImport,
  resolveDataPath,
  sessionCommand,
  withoutServiceAccount,
} from './command'

describe('resolveDataPath', () => {
  it("prend l'exemple documenté sans argument", () => {
    expect(resolveDataPath([])).toBe('data/import.example.json')
  })

  it('prend le fichier passé en argument', () => {
    expect(resolveDataPath(['data/import.json'])).toBe('data/import.json')
  })
})

describe('sessionCommand', () => {
  it('cite le chemin pour le shell, espaces et apostrophes compris', () => {
    expect(sessionCommand("data/l'an 2027.json")).toBe(
      `exec node --import tsx scripts/dev/session.ts 'data/l'\\''an 2027.json'`,
    )
  })
})

describe('emulatorsExecArgs', () => {
  it('lance Auth et Firestore sur le projet demo-covoiturage', () => {
    expect(emulatorsExecArgs('data/import.example.json')).toEqual([
      '--yes',
      'firebase-tools@15',
      'emulators:exec',
      '--project',
      'demo-covoiturage',
      '--only',
      'auth,firestore',
      "exec node --import tsx scripts/dev/session.ts 'data/import.example.json'",
    ])
  })
})

describe('withoutServiceAccount', () => {
  it('retire la clé du compte de service sans toucher au reste', () => {
    const env = { GOOGLE_APPLICATION_CREDENTIALS: '/cle.json', PATH: '/bin' }
    expect(withoutServiceAccount(env)).toEqual({ PATH: '/bin' })
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/cle.json')
  })
})

describe('isEmulatorImport', () => {
  it("reconnaît un import sur l'émulateur", () => {
    expect(isEmulatorImport('Cible : émulateur 127.0.0.1:8080 (demo-covoiturage)\n…')).toBe(true)
  })

  it('refuse un import sur la production', () => {
    expect(isEmulatorImport('Cible : PRODUCTION, projet covoiturage-college-915d5')).toBe(false)
  })
})
