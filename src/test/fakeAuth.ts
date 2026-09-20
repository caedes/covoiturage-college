import type { AuthPort, Identity, Member, MemberRepository, SignInOutcome } from '../auth/ports'

export type AuthScenario = {
  auth: AuthPort
  members: MemberRepository
  subscribeCalls(): number
  signInCalls(): number
  signOutCalls(): number
}

export const defaultMember: Member = {
  email: 'sophie.martin@exemple.fr',
  firstName: 'Sophie',
  role: 'parent',
}

type ScenarioOptions = {
  identity?: Identity | null
  member?: Member | null
  lookupFails?: boolean
  signInOutcome?: SignInOutcome
  neverEmits?: boolean
}

function scenario(options: ScenarioOptions): AuthScenario {
  const identity = options.identity ?? null
  let subscriptions = 0
  let signIns = 0
  let signOuts = 0

  return {
    auth: {
      subscribe(listener) {
        subscriptions += 1
        if (!options.neverEmits) {
          listener(identity)
        }
        return () => {}
      },
      async signIn() {
        signIns += 1
        return options.signInOutcome ?? 'started'
      },
      async signOut() {
        signOuts += 1
      },
    },
    members: {
      async find(email) {
        if (options.lookupFails) {
          throw new Error('Firestore injoignable')
        }
        const candidate = options.member
        return candidate !== null && candidate !== undefined && candidate.email === email
          ? candidate
          : null
      },
    },
    subscribeCalls() {
      return subscriptions
    },
    signInCalls() {
      return signIns
    },
    signOutCalls() {
      return signOuts
    },
  }
}

/** Le port n'émet jamais : l'état reste `loading`. */
export function loading(): AuthScenario {
  return scenario({ neverEmits: true })
}

export function signedOut(): AuthScenario {
  return scenario({ identity: null })
}

export function denied(email: string): AuthScenario {
  return scenario({ identity: { email, displayName: null }, member: null })
}

export function member(overrides: Partial<Member> = {}): AuthScenario {
  const current = { ...defaultMember, ...overrides }
  return scenario({
    identity: { email: current.email, displayName: current.firstName },
    member: current,
  })
}

export function failingLookup(): AuthScenario {
  return scenario({
    identity: { email: defaultMember.email, displayName: null },
    lookupFails: true,
  })
}

export function signInFailing(outcome: SignInOutcome): AuthScenario {
  return scenario({ identity: null, signInOutcome: outcome })
}

export type ControllableScenario = AuthScenario & {
  emit(identity: Identity | null): void
}

/** Scénario piloté depuis le test : utile pour observer une transition. */
export function controllable(
  options: { member?: Member | null; signInOutcome?: SignInOutcome } = {},
): ControllableScenario {
  const listeners: ((identity: Identity | null) => void)[] = []
  let subscriptions = 0
  let signIns = 0
  let signOuts = 0

  return {
    auth: {
      subscribe(listener) {
        subscriptions += 1
        listeners.push(listener)
        return () => {
          listeners.splice(listeners.indexOf(listener), 1)
        }
      },
      async signIn() {
        signIns += 1
        return options.signInOutcome ?? 'started'
      },
      async signOut() {
        signOuts += 1
      },
    },
    members: {
      async find(email) {
        const candidate = options.member
        return candidate !== null && candidate !== undefined && candidate.email === email
          ? candidate
          : null
      },
    },
    emit(identity) {
      for (const listener of listeners) {
        listener(identity)
      }
    },
    subscribeCalls() {
      return subscriptions
    },
    signInCalls() {
      return signIns
    },
    signOutCalls() {
      return signOuts
    },
  }
}
