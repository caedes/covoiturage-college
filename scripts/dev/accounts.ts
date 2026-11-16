import type { MemberDoc } from '../import/translate'

/** A Google account to create in the Auth emulator, so that it is listed on its sign-in page. */
export type EmulatorAccount = { email: string; displayName: string }

/** One account per imported member, parents and children alike, sorted by first name. */
export function emulatorAccounts(members: Record<string, MemberDoc>): EmulatorAccount[] {
  return Object.entries(members)
    .map(([email, member]) => ({ email, displayName: member.firstName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'))
}

/**
 * The emulator's `signInWithIdp` call that creates a Google account. The emulator accepts an
 * unsigned JSON id token; an empty host is refused, so that the call can never reach Google.
 */
export function signInWithIdpRequest(
  host: string,
  account: EmulatorAccount,
): { url: string; body: string } {
  if (!host) {
    throw new Error('FIREBASE_AUTH_EMULATOR_HOST manquant : comptes non créés.')
  }
  const idToken = JSON.stringify({
    sub: account.email,
    email: account.email,
    email_verified: true,
    name: account.displayName,
  })
  const postBody = new URLSearchParams({ id_token: idToken, providerId: 'google.com' }).toString()
  return {
    url: `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=cle-emulateur`,
    body: JSON.stringify({ postBody, requestUri: 'http://localhost', returnSecureToken: true }),
  }
}
