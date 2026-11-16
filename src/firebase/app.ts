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
 * Points Auth and Firestore at the local emulators, for the dev server and the `e2e` build only. It runs before any
 * other module uses them: `getAuth` and `getFirestore` return the same instances afterwards.
 *
 * Auth goes through `localhost`, like the app: the redirect result is read by an iframe served by
 * the emulator, and from `127.0.0.1` that iframe is cross-site, so Chrome partitions its storage
 * and the sign-in is lost. Playwright turns that partitioning off, which is why the e2e tests do
 * not see it.
 */
function connectEmulators() {
  connectAuthEmulator(getAuth(firebaseApp), 'http://localhost:9099', { disableWarnings: true })
  connectFirestoreEmulator(getFirestore(firebaseApp), '127.0.0.1', 8080)
}

/**
 * Whether this build talks to the emulators: `development` (`npm run dev`) and `e2e` (regression
 * tests). `import.meta.env.MODE` is a build-time constant: in production the branch below, and the
 * emulator addresses with it, are removed from the bundle.
 */
const USES_EMULATORS = import.meta.env.MODE === 'development' || import.meta.env.MODE === 'e2e'

if (USES_EMULATORS) {
  connectEmulators()
}
