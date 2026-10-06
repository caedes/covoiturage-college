import { describe, expect, it } from 'vitest'
import { firebaseAuthProxy } from './firebaseAuthProxy'

describe('firebaseAuthProxy', () => {
  it('relaie les pages de connexion de Firebase vers le domaine du projet', () => {
    const target = 'https://mon-projet.firebaseapp.com'
    expect(firebaseAuthProxy('mon-projet', 'development')).toEqual({
      '/__/auth': { target, changeOrigin: true },
      '/__/firebase': { target, changeOrigin: true },
    })
  })

  it("ne relaie rien en mode e2e, où l'émulateur sert sa propre page", () => {
    expect(firebaseAuthProxy('demo-covoiturage', 'e2e')).toEqual({})
  })

  it('ne relaie rien sans identifiant de projet', () => {
    expect(firebaseAuthProxy(undefined, 'development')).toEqual({})
    expect(firebaseAuthProxy('', 'development')).toEqual({})
  })
})
