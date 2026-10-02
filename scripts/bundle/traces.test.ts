import { describe, expect, it } from 'vitest'
import { emulatorTraces } from './traces'

describe('emulatorTraces', () => {
  it('relève les adresses des émulateurs et le projet de démonstration', () => {
    const bundle = 'connect("http://127.0.0.1:9099");f("127.0.0.1",8080);p:"demo-covoiturage"'
    expect(emulatorTraces(bundle)).toEqual(['127.0.0.1', 'demo-covoiturage'])
  })

  it("relève Firestore branché seul, dont l'hôte et le port sont passés séparément", () => {
    expect(emulatorTraces('connectFirestoreEmulator(db,"127.0.0.1",8080)')).toEqual(['127.0.0.1'])
  })

  it('ne relève rien dans un bundle de production', () => {
    expect(emulatorTraces('initializeApp({projectId:"covoiturage-college-915d5"})')).toEqual([])
  })
})
