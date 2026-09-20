import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const MEMBER = 'sophie.martin@exemple.fr'
const OTHER_MEMBER = 'karim.benali@exemple.fr'
const OUTSIDER = 'inconnu@exemple.fr'

let testEnv: RulesTestEnvironment

function asSignedIn(email: string, emailVerified = true) {
  return testEnv.authenticatedContext(email, { email, email_verified: emailVerified }).firestore()
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-covoiturage',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await setDoc(doc(database, 'members', MEMBER), { firstName: 'Sophie', role: 'parent' })
    await setDoc(doc(database, 'members', OTHER_MEMBER), { firstName: 'Karim', role: 'parent' })
  })
})

describe('règles de la collection members', () => {
  it('autorise un membre à lire sa propre fiche', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), 'members', MEMBER)))
  })

  it("refuse à un membre la lecture de la fiche d'un autre", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER), 'members', OTHER_MEMBER)))
  })

  it('laisse un compte hors liste lire sa fiche absente sans erreur', async () => {
    const snapshot = await assertSucceeds(getDoc(doc(asSignedIn(OUTSIDER), 'members', OUTSIDER)))
    expect(snapshot.exists()).toBe(false)
  })

  it('refuse la lecture à un visiteur non authentifié', async () => {
    const database = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(database, 'members', MEMBER)))
  })

  it("refuse la lecture à un compte dont l'adresse n'est pas vérifiée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER, false), 'members', MEMBER)))
  })

  it("refuse l'énumération de la collection", async () => {
    await assertFails(getDocs(collection(asSignedIn(MEMBER), 'members')))
  })

  it('refuse toute écriture depuis le client', async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'members', MEMBER), { firstName: 'Pirate', role: 'parent' }),
    )
  })
})

describe('règles des collections à venir', () => {
  it("refuse la lecture d'une collection métier non déclarée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER), 'trips', 'trajet-quelconque')))
  })
})
