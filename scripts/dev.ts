import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { emulatorsExecArgs, resolveDataPath, withoutServiceAccount } from './dev/command'

/**
 * `npm run dev [-- <data.json>]`: starts the Firebase emulators, imports the data file into them
 * and serves the app on top. The production project is never involved: the emulators run the
 * `demo-covoiturage` project and the service account key is dropped from the environment.
 */
const dataPath = resolveDataPath(process.argv.slice(2))
if (!existsSync(dataPath)) {
  console.error(`Fichier de données introuvable : ${dataPath}`)
  process.exit(1)
}

const child = spawn('npx', emulatorsExecArgs(dataPath), {
  stdio: 'inherit',
  env: withoutServiceAccount(process.env),
})
child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0))
})
