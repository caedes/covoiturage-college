import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { emulatorTraces } from './bundle/traces'

/**
 * Fails when a build carries the Firebase emulators wiring. Run on `dist/`, the folder the CI
 * deploys: a production bundle that talks to `127.0.0.1` would leave every parent on a blank app.
 */
const root = process.argv[2] ?? 'dist'
const found: string[] = []
for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (entry.isFile() && /\.(html|js|css)$/.test(entry.name)) {
    const path = join(entry.parentPath, entry.name)
    for (const trace of emulatorTraces(readFileSync(path, 'utf8'))) {
      found.push(`${path} : ${trace}`)
    }
  }
}
if (found.length > 0) {
  console.error(
    `Traces d'émulateur dans ${root} :\n${found.map((line) => `  - ${line}`).join('\n')}`,
  )
  process.exit(1)
}
console.log(`${root} : aucune trace d'émulateur.`)
