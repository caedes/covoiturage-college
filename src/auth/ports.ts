export type Identity = { email: string; displayName: string | null }

export type MemberRole = 'parent' | 'child'

export type Member = {
  email: string
  firstName: string
  role: MemberRole
}

/**
 * Outcome of a sign-in attempt, expressed in the vocabulary of the domain.
 *
 * `started` means Google accepted: the identity will arrive through `subscribe`.
 */
export type SignInOutcome = 'started' | 'cancelled' | 'popupBlocked' | 'unavailable'

export type AuthPort = {
  subscribe(listener: (identity: Identity | null) => void): () => void
  signIn(): Promise<SignInOutcome>
  signOut(): Promise<void>
}

export type MemberRepository = {
  find(email: string): Promise<Member | null>
}
