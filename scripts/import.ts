import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { type ExistingState, planImport } from './import/plan'
import { describeTarget, resolveTarget } from './import/target'
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

const resolved = resolveTarget(process.env)
if (!resolved.ok) {
  fail(resolved.error)
}
const { target } = resolved

let projectId: string
if (target.kind === 'emulator') {
  projectId = target.projectId
  initializeApp({ projectId })
} else {
  // `cert` takes the project from the key itself: neither GCLOUD_PROJECT left over from another
  // context nor the gcloud credentials can redirect the writes.
  let key: { project_id?: unknown }
  try {
    key = JSON.parse(readFileSync(target.keyPath, 'utf8'))
  } catch (error) {
    fail(
      `Clé illisible (${target.keyPath}) : ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (typeof key.project_id !== 'string') {
    fail(`La clé ${target.keyPath} ne précise pas de project_id.`)
  }
  projectId = key.project_id
  initializeApp({ credential: cert(target.keyPath), projectId })
}
console.log(describeTarget(target, projectId))
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
