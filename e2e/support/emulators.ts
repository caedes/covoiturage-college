import { execFileSync } from 'node:child_process'

const PROJECT_ID = 'demo-covoiturage'
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'

async function clear(url: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, { method: 'DELETE' })
  } catch {
    throw new Error(
      `Émulateurs Firebase injoignables (${url}). Lancer les TNR par « npm run test:e2e ».`,
    )
  }
  if (!response.ok) {
    throw new Error(`Remise à zéro refusée (${response.status}) : ${url}`)
  }
}

/** Empties both emulators, so that a test file never sees what another one wrote. */
export async function resetEmulators(): Promise<void> {
  await clear(
    `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  )
  await clear(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`)
}

/**
 * Imports the fictitious families with the real import script. The emulator host is forced and
 * the service account key removed: whatever the developer's shell holds, this never reaches
 * production — and the script's first line must say so.
 */
export function seedFixture(path = 'e2e/fixtures/import.json'): void {
  const inherited = { ...process.env }
  delete inherited.GOOGLE_APPLICATION_CREDENTIALS
  const output = execFileSync('npx', ['tsx', 'scripts/import.ts', path, '--apply'], {
    encoding: 'utf8',
    env: { ...inherited, FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST, GCLOUD_PROJECT: PROJECT_ID },
  })
  if (!output.startsWith('Cible : émulateur')) {
    throw new Error(`Import des données de test sur une cible inattendue :\n${output}`)
  }
}
