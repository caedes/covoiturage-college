export type Identity = { uid: string; email: string; displayName: string | null }

export type MemberRole = 'parent' | 'child'

export type Member = {
  email: string
  firstName: string
  role: MemberRole
  /** Children this parent answers for. Always empty for a child account. */
  childIds: string[]
  /** The child a child account stands for. Always `null` for a parent. */
  childId: string | null
}

/**
 * Outcome of a sign-in attempt, expressed in the vocabulary of the domain.
 *
 * `started` means Google accepted: the identity will arrive through `subscribe`.
 */
export type SignInOutcome = 'started' | 'unavailable'

export type AuthPort = {
  subscribe(listener: (identity: Identity | null) => void): () => void
  /** Leaves for Google. On success the page navigates away and the promise never settles. */
  signIn(): Promise<SignInOutcome>
  /**
   * Reads the outcome of the redirect back from Google, once per page load. `null` when there was
   * no redirect, or when the person came back without signing in.
   */
  completeSignIn(): Promise<SignInOutcome | null>
  signOut(): Promise<void>
}

export type MemberRepository = {
  find(email: string): Promise<Member | null>
}
