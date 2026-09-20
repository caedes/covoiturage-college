export type Identity = { email: string; displayName: string | null }

export type MemberRole = 'parent' | 'child'

export type Member = {
  email: string
  firstName: string
  role: MemberRole
}

/**
 * Issue d'une tentative de connexion, exprimée dans le vocabulaire du domaine.
 * `started` signifie que Google a accepté : l'identité arrivera par `subscribe`.
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
