import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth'
import { normalizeEmail } from '../auth/email'
import type { AuthPort } from '../auth/ports'
import { readErrorCode, toSignInOutcome } from '../auth/signInOutcome'
import { firebaseApp } from './app'

const auth = getAuth(firebaseApp)
const provider = new GoogleAuthProvider()

export const firebaseAuthPort: AuthPort = {
  subscribe(listener) {
    return onAuthStateChanged(auth, (user) => {
      if (user === null || user.email === null) {
        listener(null)
        return
      }
      listener({ email: normalizeEmail(user.email), displayName: user.displayName })
    })
  },

  async signIn() {
    try {
      await signInWithPopup(auth, provider)
      return 'started'
    } catch (error) {
      return toSignInOutcome(readErrorCode(error))
    }
  },

  async signOut() {
    await firebaseSignOut(auth)
  },
}
