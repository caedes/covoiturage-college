import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseImportFile } from '../import/schema'
import { toMemberDocs } from '../import/translate'
import { emulatorAccounts, signInWithIdpRequest } from './accounts'
import { isEmulatorImport, withoutServiceAccount } from './command'

/**
 * Runs inside `firebase emulators:exec`, which sets `FIRESTORE_EMULATOR_HOST` and
 * `GCLOUD_PROJECT`: imports the data file with the real import script, checks that it wrote to the
 * emulator, creates a Google account per member in the Auth emulator, then starts Vite until the
 * developer stops it.
 */
const [dataPath] = process.argv.slice(2)
if (dataPath === undefined) {
  console.error('Usage : tsx scripts/dev/session.ts <fichier.json>')
  process.exit(1)
}

const env = withoutServiceAccount(process.env)
let output: string
try {
  output = execFileSync('npx', ['tsx', 'scripts/import.ts', dataPath, '--apply'], {
    encoding: 'utf8',
    env,
  })
} catch (error) {
  console.error(`Import de ${dataPath} dans les émulateurs impossible.`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
if (!isEmulatorImport(output)) {
  console.error(`Import sur une cible inattendue, Vite n'est pas lancé :\n${output}`)
  process.exit(1)
}
console.log(output)

// The import already validated the file: parsing it again only yields the members.
const parsed = parseImportFile(JSON.parse(readFileSync(dataPath, 'utf8')))
if (parsed.ok) {
  const accounts = emulatorAccounts(toMemberDocs(parsed.file))
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? ''
  for (const account of accounts) {
    const request = signInWithIdpRequest(host, account)
    const response = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request.body,
    })
    if (!response.ok) {
      console.error(`Compte ${account.email} non créé dans l'émulateur (${response.status}).`)
      process.exit(1)
    }
  }
  console.log(`${accounts.length} compte(s) Google créé(s) dans l'émulateur.\n`)
}

const vite = spawn('npx', ['vite'], { stdio: 'inherit', env })
vite.on('error', (error) => {
  console.error(`Lancement de Vite impossible : ${error.message}`)
  process.exit(1)
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => vite.kill(signal))
}
// `emulators:exec` does not relay a SIGTERM to its script: when it stops, this process is
// re-parented, and Vite must go down with the emulators instead of keeping port 5173.
const emulatorsPid = process.ppid
setInterval(() => {
  if (process.ppid !== emulatorsPid) {
    vite.kill('SIGTERM')
  }
}, 500).unref()
vite.on('exit', (code) => {
  process.exit(code ?? 0)
})
