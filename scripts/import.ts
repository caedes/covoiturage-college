import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { type ExistingState, planImport } from './import/plan'
import { parisToday } from './import/today'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    apply: { type: 'boolean', default: false },
    prune: { type: 'boolean', default: false },
  },
})

const [path] = positionals
if (path === undefined) {
  fail('Usage : npm run import -- <fichier.json> [--apply] [--prune]')
}

let raw: unknown
try {
  raw = JSON.parse(readFileSync(path, 'utf8'))
} catch (error) {
  fail(`Lecture de ${path} impossible : ${error instanceof Error ? error.message : String(error)}`)
}

// Against the emulator no credential is needed; against the real project, the service account
// key must be pointed at explicitly, never looked up implicitly from gcloud.
const emulator = process.env.FIRESTORE_EMULATOR_HOST
if (emulator === undefined && process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
  fail(
    'GOOGLE_APPLICATION_CREDENTIALS doit désigner la clé du compte de service, rangée hors du dépôt.',
  )
}
initializeApp(
  emulator === undefined
    ? { credential: applicationDefault() }
    : { projectId: process.env.GCLOUD_PROJECT ?? 'demo-covoiturage' },
)
const database = getFirestore()

const [membersSnapshot, timetablesSnapshot] = await Promise.all([
  database.collection('members').get(),
  database.collection('timetables').get(),
])
const existing: ExistingState = {
  members: Object.fromEntries(membersSnapshot.docs.map((entry) => [entry.id, entry.data()])),
  timetables: Object.fromEntries(timetablesSnapshot.docs.map((entry) => [entry.id, entry.data()])),
}

const outcome = planImport(raw, existing, {
  today: parisToday(new Date()),
  prune: values.prune,
})
if (!outcome.ok) {
  fail(
    ["Fichier refusé, rien n'a été écrit :", ...outcome.errors.map((e) => `  - ${e}`)].join('\n'),
  )
}

console.log(outcome.report.join('\n'))
if (!values.apply) {
  console.log("\nSimulation : rien n'a été écrit. Relancer avec --apply pour appliquer.")
  process.exit(0)
}
if (outcome.writes.length === 0) {
  console.log('\nRien à écrire.')
  process.exit(0)
}

const batch = database.batch()
for (const write of outcome.writes) {
  const reference = database.doc(write.path)
  if (write.kind === 'set') {
    batch.set(reference, write.data)
  } else {
    batch.delete(reference)
  }
}
await batch.commit()
console.log(`\n${outcome.writes.length} écriture(s) appliquée(s).`)
