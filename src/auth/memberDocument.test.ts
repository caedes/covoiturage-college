import { describe, expect, it } from 'vitest'
import { toMember } from './memberDocument'

describe('toMember', () => {
  it('lit un document complet', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie', role: 'parent' })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'Sophie',
      role: 'parent',
    })
  })

  it('accepte le rôle enfant', () => {
    expect(toMember('lou@exemple.fr', { firstName: 'Lou', role: 'child' }).role).toBe('child')
  })

  it("retombe sur la partie locale de l'adresse quand le prénom manque", () => {
    expect(toMember('sophie.martin@exemple.fr', { role: 'parent' }).firstName).toBe('sophie.martin')
  })

  it('retombe sur le rôle parent quand le rôle est absent', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie' }).role).toBe('parent')
  })

  it("n'exclut personne à cause d'un document mal formé", () => {
    expect(toMember('sophie@exemple.fr', { firstName: 42, role: 'roi' })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
    })
  })

  it('tolère un document vide', () => {
    expect(toMember('sophie@exemple.fr', {})).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
    })
  })
})
