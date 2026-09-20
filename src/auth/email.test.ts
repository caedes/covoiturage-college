import { describe, expect, it } from 'vitest'
import { normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it("met l'adresse en minuscules", () => {
    expect(normalizeEmail('Sophie.Martin@Exemple.fr')).toBe('sophie.martin@exemple.fr')
  })

  it("retire les espaces autour de l'adresse", () => {
    expect(normalizeEmail('  sophie@exemple.fr  ')).toBe('sophie@exemple.fr')
  })

  it('laisse intacte une adresse déjà normalisée', () => {
    expect(normalizeEmail('sophie@exemple.fr')).toBe('sophie@exemple.fr')
  })
})
