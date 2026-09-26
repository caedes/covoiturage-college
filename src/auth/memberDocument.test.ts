import { describe, expect, it } from 'vitest'
import { toMember } from './memberDocument'

describe('toMember', () => {
  it('lit un document complet de parent', () => {
    expect(
      toMember('sophie@exemple.fr', {
        firstName: 'Sophie',
        role: 'parent',
        childIds: ['alice', 'basile'],
      }),
    ).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'Sophie',
      role: 'parent',
      childIds: ['alice', 'basile'],
      childId: null,
    })
  })

  it("lit l'enfant représenté par un compte enfant", () => {
    expect(toMember('lou@exemple.fr', { firstName: 'Lou', role: 'child', childId: 'lou' })).toEqual(
      {
        email: 'lou@exemple.fr',
        firstName: 'Lou',
        role: 'child',
        childIds: [],
        childId: 'lou',
      },
    )
  })

  it("ignore une liste d'enfants posée sur un compte enfant", () => {
    const lou = toMember('lou@exemple.fr', { role: 'child', childId: 'lou', childIds: ['alice'] })
    expect(lou.childIds).toEqual([])
  })

  it('ignore un enfant représenté posé sur un compte parent', () => {
    expect(toMember('sophie@exemple.fr', { role: 'parent', childId: 'alice' }).childId).toBeNull()
  })

  it("retombe sur la partie locale de l'adresse quand le prénom manque", () => {
    expect(toMember('sophie.martin@exemple.fr', { role: 'parent' }).firstName).toBe('sophie.martin')
  })

  it('retombe sur le rôle parent quand le rôle est absent', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie' }).role).toBe('parent')
  })

  it("garde le prénom quand seule la liste d'enfants est mal formée", () => {
    const sophie = toMember('sophie@exemple.fr', { firstName: 'Sophie', childIds: 'alice' })
    expect(sophie.firstName).toBe('Sophie')
    expect(sophie.childIds).toEqual([])
  })

  it("n'exclut personne à cause d'un document mal formé", () => {
    expect(toMember('sophie@exemple.fr', { firstName: 42, role: 'roi', childIds: [7] })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
      childIds: [],
      childId: null,
    })
  })

  it('tolère un document vide ou absent', () => {
    const expected = {
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
      childIds: [],
      childId: null,
    }
    expect(toMember('sophie@exemple.fr', {})).toEqual(expected)
    expect(toMember('sophie@exemple.fr', undefined)).toEqual(expected)
  })
})
