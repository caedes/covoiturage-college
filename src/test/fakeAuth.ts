import type { AuthPort, Identity, Member, MemberRepository, SignInOutcome } from '../auth/ports'

export type AuthScenario = {
  auth: AuthPort
  members: MemberRepository
  subscribeCalls(): number
  signInCalls(): number
  completeSignInCalls(): number
  signOutCalls(): number
}

export const defaultMember: Member = {
  email: 'sophie.martin@exemple.fr',
  firstName: 'Sophie',
  role: 'parent',
  childIds: [],
  childId: null,
}

export const defaultUid = 'uid-sophie'

type ScenarioOptions = {
  identity?: Identity | null
  member?: Member | null
  lookupFails?: boolean
  signInOutcome?: SignInOutcome
  redirectOutcome?: SignInOutcome | null
  neverEmits?: boolean
}

function scenario(options: ScenarioOptions): AuthScenario {
  const identity = options.identity ?? null
  let subscriptions = 0
  let signIns = 0
  let signOuts = 0
  let completions = 0

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
      async completeSignIn() {
        completions += 1
        return options.redirectOutcome ?? null
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
    completeSignInCalls() {
      return completions
    },
  }
}

/** The port never emits: the state stays `loading`. */
export function loading(): AuthScenario {
  return scenario({ neverEmits: true })
}

export function signedOut(): AuthScenario {
  return scenario({ identity: null })
}

export function denied(email: string): AuthScenario {
  return scenario({ identity: { uid: 'uid-inconnu', email, displayName: null }, member: null })
}

export function member(overrides: Partial<Member> = {}): AuthScenario {
  const current = { ...defaultMember, ...overrides }
  return scenario({
    identity: { uid: defaultUid, email: current.email, displayName: current.firstName },
    member: current,
  })
}

export function failingLookup(): AuthScenario {
  return scenario({
    identity: { uid: defaultUid, email: defaultMember.email, displayName: null },
    lookupFails: true,
  })
}

export function signInFailing(outcome: SignInOutcome): AuthScenario {
  return scenario({ identity: null, signInOutcome: outcome })
}

/** Back from Google with the given outcome; the port then reports no identity. */
export function redirectReturning(outcome: SignInOutcome | null): AuthScenario {
  return scenario({ identity: null, redirectOutcome: outcome })
}

export type ControllableScenario = AuthScenario & {
  emit(identity: Identity | null): void
  finishRedirect(outcome: SignInOutcome | null): Promise<void>
}

/** Scenario driven from the test: useful to observe a transition. */
export function controllable(
  options: { member?: Member | null; signInOutcome?: SignInOutcome } = {},
): ControllableScenario {
  const listeners: ((identity: Identity | null) => void)[] = []
  let subscriptions = 0
  let signIns = 0
  let signOuts = 0
  let completions = 0
  let settleRedirect: (outcome: SignInOutcome | null) => void = () => {}

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
      completeSignIn() {
        completions += 1
        return new Promise<SignInOutcome | null>((resolve) => {
          settleRedirect = resolve
        })
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
    async finishRedirect(outcome) {
      settleRedirect(outcome)
      await Promise.resolve()
    },
    completeSignInCalls() {
      return completions
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
