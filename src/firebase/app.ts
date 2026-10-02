import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { env } from '../env'

export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

/**
 * Points Auth and Firestore at the local emulators, for the `e2e` build only. It runs before any
 * other module uses them: `getAuth` and `getFirestore` return the same instances afterwards.
 */
function connectEmulators() {
  connectAuthEmulator(getAuth(firebaseApp), 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(getFirestore(firebaseApp), '127.0.0.1', 8080)
}

/**
 * Whether this build talks to the emulators. `import.meta.env.MODE` is a build-time constant: in
 * production the branch below, and the emulator addresses with it, are removed from the bundle.
 */
const USES_EMULATORS = import.meta.env.MODE === 'e2e'

if (USES_EMULATORS) {
  connectEmulators()
}
