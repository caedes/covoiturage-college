import { describe, expect, it } from 'vitest'
import { emulatorTraces } from './traces'

describe('emulatorTraces', () => {
  it('relève les adresses des émulateurs et le projet de démonstration', () => {
    const bundle = 'connect("http://127.0.0.1:9099");f("127.0.0.1",8080);p:"demo-covoiturage"'
    expect(emulatorTraces(bundle)).toEqual(['127.0.0.1:9099', 'demo-covoiturage'])
  })

  it('relève le port de Firestore écrit avec son hôte', () => {
    expect(emulatorTraces('host:"127.0.0.1:8080"')).toEqual(['127.0.0.1:8080'])
  })

  it('ne relève rien dans un bundle de production', () => {
    expect(emulatorTraces('initializeApp({projectId:"covoiturage-college-915d5"})')).toEqual([])
  })
})
