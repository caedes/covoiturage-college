// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeTarget, resolveTarget } from './target'

describe('resolveTarget', () => {
  it("vise l'émulateur quand FIRESTORE_EMULATOR_HOST est posée", () => {
    expect(
      resolveTarget({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: 'demo-x' }),
    ).toEqual({
      ok: true,
      target: { kind: 'emulator', host: '127.0.0.1:8080', projectId: 'demo-x' },
    })
  })

  it("retombe sur le projet de démonstration pour l'émulateur", () => {
    const outcome = resolveTarget({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' })
    expect(outcome.ok && outcome.target).toMatchObject({ projectId: 'demo-covoiturage' })
  })

  it('vise le projet de la clé du compte de service', () => {
    expect(resolveTarget({ GOOGLE_APPLICATION_CREDENTIALS: '/hors/depot/cle.json' })).toEqual({
      ok: true,
      target: { kind: 'project', keyPath: '/hors/depot/cle.json' },
    })
  })

  it('refuse de démarrer sans clé ni émulateur', () => {
    expect(resolveTarget({}).ok).toBe(false)
  })

  it('refuse une clé vide, qui ferait retomber sur les identifiants gcloud', () => {
    expect(resolveTarget({ GOOGLE_APPLICATION_CREDENTIALS: '  ' }).ok).toBe(false)
  })
})

describe('describeTarget', () => {
  it("annonce l'émulateur", () => {
    expect(
      describeTarget({ kind: 'emulator', host: '127.0.0.1:8080', projectId: 'demo-covoiturage' }),
    ).toBe('Cible : émulateur 127.0.0.1:8080 (demo-covoiturage)')
  })

  it('annonce la production en toutes lettres, avec le projet', () => {
    expect(describeTarget({ kind: 'project', keyPath: '/k.json' }, 'covoiturage-x')).toBe(
      'Cible : PRODUCTION, projet covoiturage-x',
    )
  })
})
