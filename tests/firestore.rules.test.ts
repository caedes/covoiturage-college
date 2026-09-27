import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const MEMBER = 'sophie.martin@exemple.fr'
const OTHER_MEMBER = 'karim.benali@exemple.fr'
const OUTSIDER = 'inconnu@exemple.fr'
const CHILD_MEMBER = 'lou@exemple.fr'

/** A date `offset` days from today, in UTC: the emulator judges with the real clock. */
function isoDay(offset: number): string {
  const day = new Date()
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0, 10)
}

const TOMORROW = isoDay(1)
const YESTERDAY = isoDay(-1)
const IN_THREE_WEEKS = isoDay(21)

function carpoolId(date: string): string {
  return `${date}_retour_college_1600`
}

function carpoolOf(date: string, driverUid: string, driverName: string, extra: object = {}) {
  return {
    date,
    direction: 'retour',
    place: 'college',
    time: '16:00',
    driverUid,
    driverName,
    updatedAt: serverTimestamp(),
    ...extra,
  }
}

function childDayId(date: string, childId: string): string {
  return `${date}_${childId}`
}

function childDayOf(date: string, childId: string, updatedByUid: string, extra: object = {}) {
  return {
    date,
    childId,
    presence: 'absent',
    skipped: [],
    updatedByUid,
    updatedAt: serverTimestamp(),
    ...extra,
  }
}

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

describe('règles de la collection timetables', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore()
      await setDoc(doc(database, 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
      await setDoc(doc(database, 'timetables', '2026-09-01'), { validFrom: '2026-09-01' })
    })
  })

  it('autorise un parent membre à lire une version', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), 'timetables', '2026-09-01')))
  })

  it('autorise un compte enfant membre à lire une version', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(CHILD_MEMBER), 'timetables', '2026-09-01')))
  })

  it('autorise un membre à lister les versions', async () => {
    await assertSucceeds(getDocs(collection(asSignedIn(MEMBER), 'timetables')))
  })

  it('refuse la lecture à un compte hors liste', async () => {
    await assertFails(getDoc(doc(asSignedIn(OUTSIDER), 'timetables', '2026-09-01')))
  })

  it('refuse la lecture à un visiteur non authentifié', async () => {
    const database = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(database, 'timetables', '2026-09-01')))
  })

  it("refuse la lecture à un membre dont l'adresse n'est pas vérifiée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER, false), 'timetables', '2026-09-01')))
  })

  it('refuse toute écriture depuis le client, même à un membre', async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'timetables', '2026-09-01'), { validFrom: '2026-09-01' }),
    )
  })
})

describe.each(['carpools', 'childDays'])('règles de la collection %s', (name) => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), name, '2026-09-28_quelconque'), { date: '2026-09-28' })
    })
  })

  it('autorise un membre à lire un document', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), name, '2026-09-28_quelconque')))
  })

  it('autorise un membre à lister une fenêtre de dates', async () => {
    const database = asSignedIn(MEMBER)
    await assertSucceeds(
      getDocs(
        query(
          collection(database, name),
          where('date', '>=', '2026-09-28'),
          where('date', '<=', '2026-10-09'),
        ),
      ),
    )
  })

  it('refuse la lecture à un compte hors liste', async () => {
    await assertFails(getDoc(doc(asSignedIn(OUTSIDER), name, '2026-09-28_quelconque')))
  })
})

describe('écritures sur la collection carpools', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
    })
  })

  async function seed(date: string, driverUid: string, driverName: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'carpools', carpoolId(date)),
        carpoolOf(date, driverUid, driverName),
      )
    })
  }

  it('autorise un parent à prendre un trajet libre à son nom', async () => {
    await assertSucceeds(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie'),
      ),
    )
  })

  it("refuse de prendre un trajet au nom d'un autre", async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, OTHER_MEMBER, 'Sophie'),
      ),
    )
  })

  it("refuse un prénom qui n'est pas celui de la fiche", async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Karim'),
      ),
    )
  })

  it('refuse une création qui prétend remplacer quelqu’un', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it('refuse un identifiant qui ne correspond pas aux champs', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', `${TOMORROW}_aller_college_1600`),
        carpoolOf(TOMORROW, MEMBER, 'Sophie'),
      ),
    )
  })

  it('refuse un champ inventé', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { vehicle: 'minibus' }),
      ),
    )
  })

  it('refuse une date de mise à jour fournie par le client', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { updatedAt: new Date('2026-01-01T00:00:00Z') }),
      ),
    )
  })

  it('refuse un jour passé', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(YESTERDAY)),
        carpoolOf(YESTERDAY, MEMBER, 'Sophie'),
      ),
    )
  })

  it('refuse un jour au-delà des deux semaines affichées', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(IN_THREE_WEEKS)),
        carpoolOf(IN_THREE_WEEKS, MEMBER, 'Sophie'),
      ),
    )
  })

  it('refuse toute écriture à un compte enfant', async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, CHILD_MEMBER, 'Lou'),
      ),
    )
  })

  it('autorise à reprendre un trajet en nommant le conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertSucceeds(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it('refuse une reprise qui nomme un autre conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { replacedDriverUid: OUTSIDER }),
      ),
    )
  })

  it('refuse une reprise sans nommer le conducteur remplacé', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie'),
      ),
    )
  })

  it('autorise le conducteur à annuler son trajet', async () => {
    await seed(TOMORROW, MEMBER, 'Sophie')
    await assertSucceeds(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse d'annuler le trajet d'un autre parent", async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse d'annuler un trajet d'un jour passé, même le sien", async () => {
    await seed(YESTERDAY, MEMBER, 'Sophie')
    await assertFails(deleteDoc(doc(asSignedIn(MEMBER), 'carpools', carpoolId(YESTERDAY))))
  })

  it('refuse à un compte enfant de reprendre un trajet', async () => {
    await seed(TOMORROW, OTHER_MEMBER, 'Karim')
    await assertFails(
      setDoc(
        doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, CHILD_MEMBER, 'Lou', { replacedDriverUid: OTHER_MEMBER }),
      ),
    )
  })

  it("refuse à un compte enfant d'annuler un trajet, même à son nom", async () => {
    await seed(TOMORROW, CHILD_MEMBER, 'Lou')
    await assertFails(deleteDoc(doc(asSignedIn(CHILD_MEMBER), 'carpools', carpoolId(TOMORROW))))
  })

  it("refuse une date ou une heure qui n'est pas une chaîne", async () => {
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { time: 1600 }),
      ),
    )
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(TOMORROW)),
        carpoolOf(TOMORROW, MEMBER, 'Sophie', { date: 20261001 }),
      ),
    )
  })

  it('accepte le quatorzième jour et refuse le quinzième', async () => {
    const [last, beyond] = [isoDay(14), isoDay(15)]
    await assertSucceeds(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(last)),
        carpoolOf(last, MEMBER, 'Sophie'),
      ),
    )
    await assertFails(
      setDoc(
        doc(asSignedIn(MEMBER), 'carpools', carpoolId(beyond)),
        carpoolOf(beyond, MEMBER, 'Sophie'),
      ),
    )
  })
})

describe('écritures sur la collection childDays', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore()
      await setDoc(doc(database, 'members', MEMBER), {
        firstName: 'Sophie',
        role: 'parent',
        childIds: ['alice'],
      })
      await setDoc(doc(database, 'members', OTHER_MEMBER), {
        firstName: 'Karim',
        role: 'parent',
        childIds: ['alice'],
      })
      await setDoc(doc(database, 'members', CHILD_MEMBER), {
        firstName: 'Lou',
        role: 'child',
        childId: 'lou',
      })
    })
  })

  function save(email: string, date: string, childId: string, data: object) {
    return setDoc(doc(asSignedIn(email), 'childDays', childDayId(date, childId)), data)
  }

  async function seed(date: string, childId: string, updatedByUid: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'childDays', childDayId(date, childId)),
        childDayOf(date, childId, updatedByUid),
      )
    })
  }

  it('autorise un parent à régler la présence de son enfant', async () => {
    await assertSucceeds(save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER)))
  })

  it("autorise une permanence et le retrait d'un sens", async () => {
    await assertSucceeds(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, {
          presence: 'present',
          permanence: '17:00',
          skipped: ['aller'],
        }),
      ),
    )
  })

  it("autorise un parent à modifier la journée réglée par l'autre parent", async () => {
    await seed(TOMORROW, 'alice', OTHER_MEMBER)
    await assertSucceeds(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, { presence: 'present' }),
      ),
    )
  })

  it("refuse l'enfant d'une autre famille", async () => {
    await assertFails(save(MEMBER, TOMORROW, 'basile', childDayOf(TOMORROW, 'basile', MEMBER)))
  })

  it("refuse une écriture signée au nom d'un autre parent", async () => {
    await assertFails(save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', OTHER_MEMBER)))
  })

  it('refuse toute écriture à un compte enfant, même pour lui-même', async () => {
    await assertFails(
      save(CHILD_MEMBER, TOMORROW, 'lou', childDayOf(TOMORROW, 'lou', CHILD_MEMBER)),
    )
  })

  it('refuse une présence hors liste', async () => {
    await assertFails(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, { presence: 'malade' }),
      ),
    )
  })

  it("refuse une permanence hors format ou qui n'est pas une chaîne", async () => {
    for (const permanence of ['17h00', '25:00', 1700]) {
      await assertFails(
        save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { permanence })),
      )
    }
  })

  it('refuse un sens de retrait inconnu, répété ou hors liste', async () => {
    for (const skipped of [['midi'], ['aller', 'aller'], 'aller']) {
      await assertFails(
        save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { skipped })),
      )
    }
  })

  it('refuse un identifiant ou une date incohérents avec les champs', async () => {
    await assertFails(save(MEMBER, TOMORROW, 'basile', childDayOf(TOMORROW, 'alice', MEMBER)))
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { date: 20261001 })),
    )
  })

  it('refuse un champ inventé ou un champ obligatoire manquant', async () => {
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', childDayOf(TOMORROW, 'alice', MEMBER, { note: 'dentiste' })),
    )
    await assertFails(
      save(MEMBER, TOMORROW, 'alice', {
        date: TOMORROW,
        childId: 'alice',
        presence: 'absent',
        updatedByUid: MEMBER,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('refuse une date de mise à jour fournie par le client', async () => {
    await assertFails(
      save(
        MEMBER,
        TOMORROW,
        'alice',
        childDayOf(TOMORROW, 'alice', MEMBER, { updatedAt: new Date('2026-01-01T00:00:00Z') }),
      ),
    )
  })

  it('refuse un jour passé', async () => {
    await assertFails(save(MEMBER, YESTERDAY, 'alice', childDayOf(YESTERDAY, 'alice', MEMBER)))
  })

  it('accepte le quatorzième jour et refuse le quinzième', async () => {
    const [last, beyond] = [isoDay(14), isoDay(15)]
    await assertSucceeds(save(MEMBER, last, 'alice', childDayOf(last, 'alice', MEMBER)))
    await assertFails(save(MEMBER, beyond, 'alice', childDayOf(beyond, 'alice', MEMBER)))
  })

  it("refuse toute suppression, même au parent de l'enfant", async () => {
    await seed(TOMORROW, 'alice', MEMBER)
    await assertFails(
      deleteDoc(doc(asSignedIn(MEMBER), 'childDays', childDayId(TOMORROW, 'alice'))),
    )
  })
})

describe('règles des collections à venir', () => {
  it("refuse la lecture d'une collection métier non déclarée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER), 'trips', 'trajet-quelconque')))
  })
})
