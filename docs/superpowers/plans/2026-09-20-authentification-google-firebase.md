# Authentification Google via Firebase — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placer l'intégralité de l'application derrière une authentification Google et restreindre l'accès à une liste blanche nominative stockée dans Firestore.

**Architecture:** Un composant `AuthGate` enveloppe toute la table de routes et rend, selon une machine à états à cinq cas, l'un des quatre écrans d'authentification ou l'`<Outlet />` de l'application. L'authentification est décrite par deux interfaces (`AuthPort`, `MemberRepository`) injectées en props à `AuthProvider` : `main.tsx` y branche les adaptateurs Firebase, les tests y branchent des faux en mémoire. Le SDK Firebase n'entre donc jamais dans le graphe d'imports de la suite de tests. L'autorisation repose sur l'existence d'un document `members/{email-en-minuscules}` dans Firestore, protégé par des règles qui n'autorisent à chacun que la lecture de sa propre fiche.

**Tech Stack:** firebase 12.19.0, @firebase/rules-unit-testing 5.0.2, firebase-tools 15 (via `npx`, non installé), et l'existant : Vite 8, React 19.3, React Router 8.4, TypeScript 7, Zod 4, Vitest 5.0.1, Testing Library 16.3, jsdom 30, Biome 2.5.

**Spec:** `docs/superpowers/specs/2026-09-20-authentification-google-firebase-design.md`

## Global Constraints

- **Aucune fonctionnalité métier.** Ce plan livre le mécanisme d'accès, rien d'autre. Pas d'écran de planning, pas de modèle de trajet.
- **Aucun composant de `src/auth/`, `src/routes/`, `src/components/` n'importe quoi que ce soit de `firebase/*`.** Seuls les trois fichiers de `src/firebase/` et `src/main.tsx` connaissent le SDK.
- **Identifiants en anglais, interface en français.** Noms de types, fonctions, variables, fichiers et champs Firestore en anglais ; textes affichés, messages d'erreur et noms de tests en français.
- **Un seul `h1` par écran.** Chaque écran d'authentification porte ses propres landmarks : il vit au-dessus de `Layout` et n'hérite ni de son `<header>` ni de son `<main>`.
- **Toute nouvelle vue est couverte par un test de structure accessible** (`h1` unique, landmarks, accès au clavier). C'est la règle de contribution du README.
- **Style de code imposé par Biome :** guillemets simples, pas de point-virgule en fin d'instruction, indentation 2 espaces, largeur de ligne 100, imports triés alphabétiquement au sein de chaque accolade.
- **`verbatimModuleSyntax` est actif :** tout import de type doit s'écrire `import type { X } from '...'` ou `import { type X } from '...'`.
- **`noUnusedLocals` et `noUnusedParameters` sont actifs :** aucune variable ni paramètre inutilisé ne compile.
- **Collection Firestore :** `members`, identifiant de document = **e-mail en minuscules**, champs `firstName` (chaîne) et `role` (`parent` ou `child`).
- **Aucune écriture cliente sur Firestore.** Les fiches sont créées à la main dans la console.
- **Quatre variables d'environnement, pas plus :** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
- **Chien de garde :** 10 000 ms sur l'état `loading`.
- **Commits :** Conventional Commits, un commit par tâche minimum.

---

## Structure des fichiers

**Créés — logique pure, sans React ni Firebase :**

| Fichier | Responsabilité |
| --- | --- |
| `src/auth/ports.ts` | Les deux interfaces et les types du domaine. Aucune implémentation. |
| `src/auth/email.ts` | `normalizeEmail` — la seule définition de « e-mail en minuscules ». |
| `src/auth/authState.ts` | L'union discriminée `AuthState`, les événements, et `reduce`. Toute la logique décisionnelle. |
| `src/auth/signInOutcome.ts` | Traduction des codes d'erreur Firebase en issues du domaine. |
| `src/auth/memberDocument.ts` | Lecture défensive d'un document Firestore vers un `Member`. |

**Créés — React :**

| Fichier | Responsabilité |
| --- | --- |
| `src/auth/AuthContext.ts` | Le contexte et son type de valeur. |
| `src/auth/AuthProvider.tsx` | Souscription au port, résolution du membre, chien de garde, actions. |
| `src/auth/useAuth.ts` | Hook de consommation, refuse d'être appelé hors provider. |
| `src/auth/AuthGate.tsx` | `switch` exhaustif sur `status`. |
| `src/auth/LoadingScreen.tsx` | Écran `role="status"`. |
| `src/auth/SignInScreen.tsx` | Bouton Google + message d'échec éventuel. |
| `src/auth/AccessDeniedScreen.tsx` | Adresse cherchée + changement de compte. |
| `src/auth/ErrorScreen.tsx` | Message + « Réessayer ». |

**Créés — adaptateurs, exclus de la couverture :**

| Fichier | Responsabilité |
| --- | --- |
| `src/firebase/app.ts` | `initializeApp` depuis `env`. |
| `src/firebase/firebaseAuth.ts` | Implémente `AuthPort`. |
| `src/firebase/firebaseMembers.ts` | Implémente `MemberRepository`. |

**Créés — tests et configuration :**

`src/test/fakeAuth.ts`, `src/test/renderWithAuth.tsx`, `tests/firestore.rules.test.ts`, `vitest.rules.config.ts`, `firestore.rules`, `firebase.json`, `.firebaserc`, `.env.example`.

**Modifiés :**

`src/env.ts`, `src/env.test.ts`, `src/routes/routes.tsx`, `src/routes/routes.test.tsx`, `src/components/Layout.tsx`, `src/components/Layout.test.tsx`, `src/test/renderRoute.tsx`, `src/main.tsx`, `vite.config.ts`, `package.json`, `.gitignore`, `.github/workflows/ci.yml`, `README.md`.

**Ordre des tâches :** l'application reste lançable et la suite reste verte à la fin de chaque tâche. Les adaptateurs Firebase et la composition dans `main.tsx` (tâche 5) précèdent délibérément l'installation de la porte (tâche 6) : dans l'ordre inverse, `npm run dev` serait cassé entre les deux.

---

### Task 1: Logique pure — ports, e-mail, machine à états, traduction d'erreurs

Aucune dépendance React, aucun accès réseau. Cette tâche pose tous les types que les tâches suivantes consomment, et couvre exhaustivement la seule logique décisionnelle du système.

**Files:**
- Create: `src/auth/ports.ts`
- Create: `src/auth/email.ts`
- Test: `src/auth/email.test.ts`
- Create: `src/auth/signInOutcome.ts`
- Test: `src/auth/signInOutcome.test.ts`
- Create: `src/auth/authState.ts`
- Test: `src/auth/authState.test.ts`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces:
  - `src/auth/ports.ts` : types `Identity`, `MemberRole`, `Member`, `SignInOutcome`, `AuthPort`, `MemberRepository`.
  - `src/auth/email.ts` : `normalizeEmail(email: string): string`.
  - `src/auth/signInOutcome.ts` : `toSignInOutcome(code: string): SignInOutcome` et `readErrorCode(error: unknown): string`.
  - `src/auth/authState.ts` : types `SignInFailure`, `AuthState`, `AuthEvent`, la constante `initialAuthState: AuthState`, et `reduce(state: AuthState, event: AuthEvent): AuthState`.

- [ ] **Step 1: Créer `src/auth/ports.ts`**

Pas de test : ce fichier ne contient que des types, il n'a aucun comportement à vérifier. Les tâches suivantes le mettent à l'épreuve.

```ts
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
```

- [ ] **Step 2: Écrire le test qui échoue pour `normalizeEmail`**

Créer `src/auth/email.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('met l\'adresse en minuscules', () => {
    expect(normalizeEmail('Sophie.Martin@Exemple.fr')).toBe('sophie.martin@exemple.fr')
  })

  it('retire les espaces autour de l\'adresse', () => {
    expect(normalizeEmail('  sophie@exemple.fr  ')).toBe('sophie@exemple.fr')
  })

  it('laisse intacte une adresse déjà normalisée', () => {
    expect(normalizeEmail('sophie@exemple.fr')).toBe('sophie@exemple.fr')
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/email.test.ts`
Expected: FAIL — `Failed to resolve import "./email"`.

- [ ] **Step 4: Créer `src/auth/email.ts`**

```ts
/**
 * Seule définition de « e-mail en minuscules » du projet. L'identifiant d'un
 * document `members` est produit par cette fonction, et par elle seule.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/auth/email.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Écrire le test qui échoue pour la traduction des erreurs**

Créer `src/auth/signInOutcome.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { readErrorCode, toSignInOutcome } from './signInOutcome'

describe('toSignInOutcome', () => {
  it('traite la fermeture du popup comme une annulation', () => {
    expect(toSignInOutcome('auth/popup-closed-by-user')).toBe('cancelled')
  })

  it('traite une demande de popup annulée comme une annulation', () => {
    expect(toSignInOutcome('auth/cancelled-popup-request')).toBe('cancelled')
  })

  it('reconnaît un popup bloqué par le navigateur', () => {
    expect(toSignInOutcome('auth/popup-blocked')).toBe('popupBlocked')
  })

  it('range tout autre code en indisponibilité', () => {
    expect(toSignInOutcome('auth/network-request-failed')).toBe('unavailable')
  })
})

describe('readErrorCode', () => {
  it('extrait le code d\'une erreur Firebase', () => {
    expect(readErrorCode({ code: 'auth/popup-blocked' })).toBe('auth/popup-blocked')
  })

  it('retourne un code inconnu pour une valeur sans code', () => {
    expect(readErrorCode(new Error('panne'))).toBe('unknown')
  })

  it('retourne un code inconnu pour null', () => {
    expect(readErrorCode(null)).toBe('unknown')
  })

  it('retourne un code inconnu quand le code n\'est pas une chaîne', () => {
    expect(readErrorCode({ code: 42 })).toBe('unknown')
  })
})
```

- [ ] **Step 7: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/signInOutcome.test.ts`
Expected: FAIL — `Failed to resolve import "./signInOutcome"`.

- [ ] **Step 8: Créer `src/auth/signInOutcome.ts`**

```ts
import type { SignInOutcome } from './ports'

const CANCELLED_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request']

/**
 * Frontière entre les codes d'erreur Firebase et le vocabulaire du domaine.
 * Fermer la fenêtre Google est un geste délibéré, pas un incident : les deux
 * codes d'annulation ne produisent aucun message affiché.
 */
export function toSignInOutcome(code: string): SignInOutcome {
  if (CANCELLED_CODES.includes(code)) {
    return 'cancelled'
  }
  if (code === 'auth/popup-blocked') {
    return 'popupBlocked'
  }
  return 'unavailable'
}

export function readErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown }
    if (typeof code === 'string') {
      return code
    }
  }
  return 'unknown'
}
```

- [ ] **Step 9: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/auth/signInOutcome.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 10: Écrire le test qui échoue pour la machine à états**

Créer `src/auth/authState.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { type AuthState, initialAuthState, reduce } from './authState'
import type { Member } from './ports'

const sophie: Member = { email: 'sophie@exemple.fr', firstName: 'Sophie', role: 'parent' }

describe('initialAuthState', () => {
  it('démarre en chargement', () => {
    expect(initialAuthState).toEqual({ status: 'loading' })
  })
})

describe('reduce', () => {
  it('passe en déconnecté quand il n\'y a pas d\'identité', () => {
    expect(reduce(initialAuthState, { type: 'identityChanged', identity: null })).toEqual({
      status: 'signedOut',
    })
  })

  it('reste en chargement le temps de résoudre la fiche du membre', () => {
    const state = reduce(
      { status: 'signedOut' },
      { type: 'identityChanged', identity: { email: 'sophie@exemple.fr', displayName: 'Sophie' } },
    )
    expect(state).toEqual({ status: 'loading' })
  })

  it('passe en membre quand la fiche existe', () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: sophie,
        email: sophie.email,
        displayName: 'Sophie M.',
      }),
    ).toEqual({ status: 'member', member: sophie, displayName: 'Sophie M.' })
  })

  it('passe en accès refusé quand la fiche est absente, en conservant l\'adresse cherchée', () => {
    expect(
      reduce(initialAuthState, {
        type: 'memberResolved',
        member: null,
        email: 'inconnu@exemple.fr',
        displayName: null,
      }),
    ).toEqual({ status: 'denied', email: 'inconnu@exemple.fr' })
  })

  it('passe en erreur quand la lecture de la fiche échoue', () => {
    expect(reduce(initialAuthState, { type: 'lookupFailed' })).toEqual({ status: 'error' })
  })

  it('retient l\'échec d\'un popup bloqué sur l\'écran de connexion', () => {
    expect(
      reduce({ status: 'signedOut' }, { type: 'signInFailed', failure: 'popupBlocked' }),
    ).toEqual({ status: 'signedOut', failure: 'popupBlocked' })
  })

  it('n\'affiche aucune erreur quand la connexion est annulée', () => {
    expect(
      reduce({ status: 'signedOut', failure: 'popupBlocked' }, { type: 'signInCancelled' }),
    ).toEqual({ status: 'signedOut' })
  })

  it('bascule en erreur quand le chargement expire', () => {
    expect(reduce(initialAuthState, { type: 'timedOut' })).toEqual({ status: 'error' })
  })

  it('ignore une expiration survenue hors chargement', () => {
    const settled: AuthState = { status: 'member', member: sophie, displayName: null }
    expect(reduce(settled, { type: 'timedOut' })).toBe(settled)
  })

  it('repart en chargement quand on demande une nouvelle tentative', () => {
    expect(reduce({ status: 'error' }, { type: 'retryRequested' })).toEqual({ status: 'loading' })
  })
})
```

- [ ] **Step 11: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/authState.test.ts`
Expected: FAIL — `Failed to resolve import "./authState"`.

- [ ] **Step 12: Créer `src/auth/authState.ts`**

```ts
import type { Identity, Member } from './ports'

export type SignInFailure = 'popupBlocked' | 'unavailable'

/**
 * Cinq états, et rien d'autre. `error` couvre aussi bien l'échec de lecture
 * Firestore que l'expiration du chien de garde : sans lui, une panne réseau
 * retomberait sur `denied` et annoncerait à un membre légitime qu'il n'a pas
 * accès.
 */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; failure?: SignInFailure }
  | { status: 'denied'; email: string }
  | { status: 'member'; member: Member; displayName: string | null }
  | { status: 'error' }

export type AuthEvent =
  | { type: 'identityChanged'; identity: Identity | null }
  | { type: 'memberResolved'; member: Member | null; email: string; displayName: string | null }
  | { type: 'lookupFailed' }
  | { type: 'signInFailed'; failure: SignInFailure }
  | { type: 'signInCancelled' }
  | { type: 'timedOut' }
  | { type: 'retryRequested' }

export const initialAuthState: AuthState = { status: 'loading' }

export function reduce(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'identityChanged':
      return event.identity === null ? { status: 'signedOut' } : { status: 'loading' }
    case 'memberResolved':
      return event.member === null
        ? { status: 'denied', email: event.email }
        : { status: 'member', member: event.member, displayName: event.displayName }
    case 'lookupFailed':
      return { status: 'error' }
    case 'signInFailed':
      return { status: 'signedOut', failure: event.failure }
    case 'signInCancelled':
      return { status: 'signedOut' }
    case 'timedOut':
      return state.status === 'loading' ? { status: 'error' } : state
    case 'retryRequested':
      return { status: 'loading' }
  }
}
```

- [ ] **Step 13: Lancer la suite complète**

Run: `npm test`
Expected: PASS — les 3 suites existantes plus les 3 nouvelles.

- [ ] **Step 14: Vérifier le formatage et le typage**

Run: `npm run lint && npx tsc -b`
Expected: aucune erreur.

- [ ] **Step 15: Commit**

```bash
git add src/auth/ports.ts src/auth/email.ts src/auth/email.test.ts \
  src/auth/signInOutcome.ts src/auth/signInOutcome.test.ts \
  src/auth/authState.ts src/auth/authState.test.ts
git commit -m "feat: machine à états et ports d'authentification"
```

---

### Task 2: Contexte React, faux ports et `AuthProvider`

Le provider souscrit au port, résout la fiche du membre, arme le chien de garde et expose les actions. Les faux ports créés ici servent à toutes les tâches suivantes.

**Files:**
- Create: `src/auth/AuthContext.ts`
- Create: `src/auth/useAuth.ts`
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/test/fakeAuth.ts`
- Test: `src/auth/AuthProvider.test.tsx`

**Interfaces:**
- Consumes: de la tâche 1 — `AuthPort`, `MemberRepository`, `Member`, `Identity`, `SignInOutcome`, `AuthState`, `AuthEvent`, `initialAuthState`, `reduce`.
- Produces:
  - `src/auth/AuthContext.ts` : type `AuthContextValue = { state: AuthState; signIn: () => Promise<void>; signOut: () => Promise<void>; retry: () => void }` et `AuthContext` (valeur par défaut `null`).
  - `src/auth/useAuth.ts` : `useAuth(): AuthContextValue`.
  - `src/auth/AuthProvider.tsx` : `AuthProvider({ auth, members, children })` et la constante `LOADING_TIMEOUT_MS = 10_000`.
  - `src/test/fakeAuth.ts` : type `AuthScenario = { auth: AuthPort; members: MemberRepository; subscribeCalls(): number; signInCalls(): number; signOutCalls(): number }`, la constante `defaultMember`, et les constructeurs `loading()`, `signedOut()`, `denied(email)`, `member(overrides?)`, `failingLookup()`, `signInFailing(outcome)`, `controllable(options?)`. Tout scénario compte les appels aux actions, ce qui permet de vérifier un bouton sans espion supplémentaire.

- [ ] **Step 1: Créer `src/auth/AuthContext.ts`**

```ts
import { createContext } from 'react'
import type { AuthState } from './authState'

export type AuthContextValue = {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  retry: () => void
}

/**
 * `AuthState` reste une donnée pure : les actions vivent ici, pas dans l'état,
 * ce qui laisse `reduce` testable sans React.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
```

- [ ] **Step 2: Créer `src/auth/useAuth.ts`**

```ts
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error("useAuth doit être appelé à l'intérieur d'un AuthProvider.")
  }
  return value
}
```

- [ ] **Step 3: Créer `src/test/fakeAuth.ts`**

```tsx
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
```

- [ ] **Step 4: Écrire le test qui échoue pour `AuthProvider`**

Créer `src/auth/AuthProvider.test.tsx` :

```tsx
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type AuthScenario,
  controllable,
  defaultMember,
  denied,
  failingLookup,
  loading,
  member,
  signInFailing,
  signedOut,
} from '../test/fakeAuth'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

function wrapperFor(current: AuthScenario) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider auth={current.auth} members={current.members}>
        {children}
      </AuthProvider>
    )
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('AuthProvider', () => {
  it('reste en chargement tant que le port n\'a rien émis', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(loading()) })
    expect(result.current.state).toEqual({ status: 'loading' })
  })

  it('passe en déconnecté quand le port émet une identité nulle', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(signedOut()) })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
  })

  it('passe en membre quand la fiche existe', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(member()) })
    await waitFor(() => expect(result.current.state.status).toBe('member'))
    expect(result.current.state).toEqual({
      status: 'member',
      member: defaultMember,
      displayName: 'Sophie',
    })
  })

  it('passe en accès refusé quand la fiche est absente', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(denied('inconnu@exemple.fr')),
    })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'denied', email: 'inconnu@exemple.fr' }),
    )
  })

  it('passe en erreur quand la lecture de la fiche échoue', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(failingLookup()) })
    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }))
  })

  it('bascule en erreur au bout de dix secondes sans résolution', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(loading()) })
    expect(result.current.state.status).toBe('loading')
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.state).toEqual({ status: 'error' })
  })

  it('signale un popup bloqué sans quitter l\'écran de connexion', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(signInFailing('popupBlocked')),
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
    await act(async () => {
      await result.current.signIn()
    })
    expect(result.current.state).toEqual({ status: 'signedOut', failure: 'popupBlocked' })
  })

  it('n\'affiche rien quand la personne ferme la fenêtre Google', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(signInFailing('cancelled')),
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))
    await act(async () => {
      await result.current.signIn()
    })
    expect(result.current.state).toEqual({ status: 'signedOut' })
  })

  it('suit une connexion réussie jusqu\'à l\'état membre', async () => {
    const current = controllable({ member: defaultMember })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })

    act(() => {
      current.emit(null)
    })
    await waitFor(() => expect(result.current.state.status).toBe('signedOut'))

    await act(async () => {
      await result.current.signIn()
    })
    expect(current.signInCalls()).toBe(1)

    act(() => {
      current.emit({ email: defaultMember.email, displayName: 'Sophie' })
    })
    await waitFor(() => expect(result.current.state.status).toBe('member'))
  })

  it('délègue la déconnexion au port', async () => {
    const current = controllable({ member: defaultMember })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await act(async () => {
      await result.current.signOut()
    })
    expect(current.signOutCalls()).toBe(1)
  })

  it('resouscrit au port quand on réessaie', async () => {
    const current = failingLookup()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperFor(current) })
    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(current.subscribeCalls()).toBe(1)

    act(() => {
      result.current.retry()
    })

    // On observe la resouscription, pas l'état : le provider était déjà en
    // erreur, donc réassertion sur `error` passerait sans que `retry` marche.
    await waitFor(() => expect(current.subscribeCalls()).toBe(2))
  })
})

describe('useAuth', () => {
  it('refuse d\'être appelé hors du provider', () => {
    function Probe() {
      useAuth()
      return null
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/AuthProvider/)
    consoleError.mockRestore()
    expect(screen.queryByRole('main')).toBeNull()
  })
})
```

- [ ] **Step 5: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/AuthProvider.test.tsx`
Expected: FAIL — `Failed to resolve import "./AuthProvider"`.

- [ ] **Step 6: Créer `src/auth/AuthProvider.tsx`**

```tsx
import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { initialAuthState, reduce } from './authState'
import type { AuthPort, MemberRepository } from './ports'

/** Dix secondes : au-delà, on affiche une erreur plutôt qu'un écran figé. */
export const LOADING_TIMEOUT_MS = 10_000

type AuthProviderProps = {
  auth: AuthPort
  members: MemberRepository
  children: ReactNode
}

export function AuthProvider({ auth, members, children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(reduce, initialAuthState)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let abandoned = false

    const unsubscribe = auth.subscribe((identity) => {
      dispatch({ type: 'identityChanged', identity })
      if (identity === null) {
        return
      }
      members
        .find(identity.email)
        .then((found) => {
          if (abandoned) {
            return
          }
          dispatch({
            type: 'memberResolved',
            member: found,
            email: identity.email,
            displayName: identity.displayName,
          })
        })
        .catch(() => {
          if (abandoned) {
            return
          }
          dispatch({ type: 'lookupFailed' })
        })
    })

    return () => {
      abandoned = true
      unsubscribe()
    }
  }, [auth, members, attempt])

  useEffect(() => {
    if (state.status !== 'loading') {
      return
    }
    const timer = setTimeout(() => dispatch({ type: 'timedOut' }), LOADING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state.status])

  const signIn = useCallback(async () => {
    const outcome = await auth.signIn()
    if (outcome === 'cancelled') {
      dispatch({ type: 'signInCancelled' })
      return
    }
    if (outcome === 'popupBlocked' || outcome === 'unavailable') {
      dispatch({ type: 'signInFailed', failure: outcome })
    }
  }, [auth])

  const signOut = useCallback(async () => {
    await auth.signOut()
  }, [auth])

  const retry = useCallback(() => {
    dispatch({ type: 'retryRequested' })
    setAttempt((previous) => previous + 1)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, retry }),
    [state, signIn, signOut, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

- [ ] **Step 7: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/auth/AuthProvider.test.tsx`
Expected: PASS, 12 tests.

Si le test du chien de garde échoue avec un avertissement `act`, vérifier que `vi.useFakeTimers()` est bien appelé **avant** `renderHook` et que l'avancement du temps est enveloppé dans `await act(async () => { ... })`.

- [ ] **Step 8: Lancer la suite complète, le lint et le typage**

Run: `npm test && npm run lint && npx tsc -b`
Expected: tout vert.

- [ ] **Step 9: Commit**

```bash
git add src/auth/AuthContext.ts src/auth/useAuth.ts src/auth/AuthProvider.tsx \
  src/auth/AuthProvider.test.tsx src/test/fakeAuth.ts
git commit -m "feat: provider d'authentification et faux ports de test"
```

---

### Task 3: Les quatre écrans d'authentification

Quatre vues neuves, donc quatre tests de structure accessible. Elles vivent au-dessus de `Layout` : chacune porte son propre `<main id="main">` et son unique `h1`.

**Files:**
- Create: `src/test/renderWithAuth.tsx`
- Create: `src/auth/LoadingScreen.tsx`
- Create: `src/auth/SignInScreen.tsx`
- Create: `src/auth/AccessDeniedScreen.tsx`
- Create: `src/auth/ErrorScreen.tsx`
- Test: `src/auth/screens.test.tsx`

**Interfaces:**
- Consumes: de la tâche 2 — `AuthContext`, `AuthContextValue`, `useAuth` ; de la tâche 1 — `SignInFailure`, `initialAuthState`.
- Produces:
  - `src/test/renderWithAuth.tsx` : `renderWithAuth(ui: ReactNode, overrides?: Partial<AuthContextValue>)`, qui retourne le résultat de `render` augmenté de `value` (le `AuthContextValue` effectivement fourni, dont les actions sont des `vi.fn()`).
  - `LoadingScreen()`, `SignInScreen({ failure }: { failure?: SignInFailure })`, `AccessDeniedScreen({ email }: { email: string })`, `ErrorScreen()`.

- [ ] **Step 1: Créer `src/test/renderWithAuth.tsx`**

```tsx
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { initialAuthState } from '../auth/authState'

/**
 * Monte un écran avec un contexte d'authentification contrôlé. Les actions sont
 * des espions : les écrans sont testés sur ce qu'ils déclenchent, pas sur ce que
 * le provider en fait.
 */
export function renderWithAuth(ui: ReactNode, overrides: Partial<AuthContextValue> = {}) {
  const value: AuthContextValue = {
    state: initialAuthState,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn(),
    ...overrides,
  }
  return {
    ...render(<AuthContext.Provider value={value}>{ui}</AuthContext.Provider>),
    value,
  }
}
```

- [ ] **Step 2: Écrire le test qui échoue pour les quatre écrans**

Créer `src/auth/screens.test.tsx` :

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithAuth } from '../test/renderWithAuth'
import { AccessDeniedScreen } from './AccessDeniedScreen'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'
import { SignInScreen } from './SignInScreen'

describe('LoadingScreen', () => {
  it('expose un main, un unique h1 et un statut annoncé', () => {
    renderWithAuth(<LoadingScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('SignInScreen', () => {
  it('expose un main et un unique h1', () => {
    renderWithAuth(<SignInScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('propose un bouton de connexion Google atteignable au clavier', async () => {
    const user = userEvent.setup()
    renderWithAuth(<SignInScreen />)
    await user.tab()
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toHaveFocus()
  })

  it('déclenche la connexion au clic', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<SignInScreen />)
    await user.click(screen.getByRole('button', { name: /se connecter avec google/i }))
    expect(value.signIn).toHaveBeenCalledTimes(1)
  })

  it('n\'affiche aucune alerte tant qu\'aucune tentative n\'a échoué', () => {
    renderWithAuth(<SignInScreen />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('annonce un popup bloqué et oriente vers un autre navigateur', () => {
    renderWithAuth(<SignInScreen failure="popupBlocked" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/safari ou chrome/i)
  })

  it('annonce une connexion indisponible', () => {
    renderWithAuth(<SignInScreen failure="unavailable" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/connexion internet/i)
  })
})

describe('AccessDeniedScreen', () => {
  it('expose un main et un unique h1', () => {
    renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('affiche l\'adresse exacte que l\'application a cherchée', () => {
    renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    expect(screen.getByText('inconnu@exemple.fr')).toBeInTheDocument()
  })

  it('permet de se déconnecter pour essayer un autre compte', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<AccessDeniedScreen email="inconnu@exemple.fr" />)
    await user.click(screen.getByRole('button', { name: /essayer avec un autre compte/i }))
    expect(value.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorScreen', () => {
  it('expose un main, un unique h1 et une alerte', () => {
    renderWithAuth(<ErrorScreen />)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('permet de relancer la vérification', async () => {
    const user = userEvent.setup()
    const { value } = renderWithAuth(<ErrorScreen />)
    await user.click(screen.getByRole('button', { name: /réessayer/i }))
    expect(value.retry).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/screens.test.tsx`
Expected: FAIL — `Failed to resolve import "./AccessDeniedScreen"`.

- [ ] **Step 4: Créer `src/auth/LoadingScreen.tsx`**

```tsx
export function LoadingScreen() {
  return (
    <main id="main" tabIndex={-1}>
      <h1>Vérification de votre accès</h1>
      <p role="status">Un instant, nous vérifions votre compte…</p>
    </main>
  )
}
```

- [ ] **Step 5: Créer `src/auth/SignInScreen.tsx`**

```tsx
import type { SignInFailure } from './authState'
import { useAuth } from './useAuth'

const FAILURE_MESSAGES: Record<SignInFailure, string> = {
  popupBlocked:
    'Votre navigateur a bloqué la fenêtre de connexion. Ouvrez cette page dans Safari ou Chrome, puis réessayez.',
  unavailable: 'La connexion a échoué. Vérifiez votre connexion internet, puis réessayez.',
}

export function SignInScreen({ failure }: { failure?: SignInFailure }) {
  const { signIn } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Covoiturage collège</h1>
      <p>Cette application est réservée aux parents inscrits. Connectez-vous pour continuer.</p>
      {failure === undefined ? null : <p role="alert">{FAILURE_MESSAGES[failure]}</p>}
      <button type="button" onClick={() => void signIn()}>
        Se connecter avec Google
      </button>
    </main>
  )
}
```

- [ ] **Step 6: Créer `src/auth/AccessDeniedScreen.tsx`**

```tsx
import { useAuth } from './useAuth'

export function AccessDeniedScreen({ email }: { email: string }) {
  const { signOut } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Accès refusé</h1>
      <p>
        Le compte <strong>{email}</strong> ne fait pas partie des parents inscrits.
      </p>
      <p>
        Si vous pensez qu'il s'agit d'une erreur, vérifiez que vous êtes connecté avec le bon compte
        Google, puis contactez l'organisateur.
      </p>
      <button type="button" onClick={() => void signOut()}>
        Essayer avec un autre compte
      </button>
    </main>
  )
}
```

- [ ] **Step 7: Créer `src/auth/ErrorScreen.tsx`**

```tsx
import { useAuth } from './useAuth'

export function ErrorScreen() {
  const { retry } = useAuth()

  return (
    <main id="main" tabIndex={-1}>
      <h1>Problème technique</h1>
      <p role="alert">
        Impossible de vérifier votre accès pour le moment. Vérifiez votre connexion internet, puis
        réessayez.
      </p>
      <button type="button" onClick={retry}>
        Réessayer
      </button>
    </main>
  )
}
```

- [ ] **Step 8: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/auth/screens.test.tsx`
Expected: PASS, 13 tests.

- [ ] **Step 9: Lancer la suite complète, le lint et le typage**

Run: `npm test && npm run lint && npx tsc -b`
Expected: tout vert.

- [ ] **Step 10: Commit**

```bash
git add src/test/renderWithAuth.tsx src/auth/LoadingScreen.tsx src/auth/SignInScreen.tsx \
  src/auth/AccessDeniedScreen.tsx src/auth/ErrorScreen.tsx src/auth/screens.test.tsx
git commit -m "feat: écrans de connexion, refus, chargement et erreur"
```

---

### Task 4: Variables d'environnement Firebase

Le schéma Zod existant gagne quatre entrées. Les tests ne chargent jamais Firebase, mais `src/env.ts` valide `import.meta.env` **au moment de l'import** : sans valeurs injectées dans l'environnement Vitest, toute la suite tomberait dès qu'un fichier importerait `env`.

**Files:**
- Modify: `src/env.ts`
- Modify: `src/env.test.ts`
- Modify: `vite.config.ts`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `env.VITE_FIREBASE_API_KEY`, `env.VITE_FIREBASE_AUTH_DOMAIN`, `env.VITE_FIREBASE_PROJECT_ID`, `env.VITE_FIREBASE_APP_ID`, tous de type `string`. La tâche 5 les consomme dans `src/firebase/app.ts`.

- [ ] **Step 1: Écrire le test qui échoue**

Remplacer entièrement `src/env.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const validEnv = {
  MODE: 'test',
  BASE_URL: '/',
  DEV: true,
  PROD: false,
  VITE_FIREBASE_API_KEY: 'cle-de-test',
  VITE_FIREBASE_AUTH_DOMAIN: 'exemple.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'exemple',
  VITE_FIREBASE_APP_ID: '1:0:web:0',
}

describe('parseEnv', () => {
  it('accepte un environnement valide', () => {
    expect(parseEnv(validEnv)).toEqual(validEnv)
  })

  it('rejette un environnement invalide', () => {
    expect(() => parseEnv({ ...validEnv, MODE: '' })).toThrow(/invalides/)
  })

  it('rejette un environnement sans configuration Firebase', () => {
    const { VITE_FIREBASE_API_KEY: _omitted, ...withoutKey } = validEnv
    expect(() => parseEnv(withoutKey)).toThrow(/invalides/)
  })

  it('rejette une configuration Firebase vide', () => {
    expect(() => parseEnv({ ...validEnv, VITE_FIREBASE_PROJECT_ID: '' })).toThrow(/invalides/)
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/env.test.ts`
Expected: FAIL — le premier test échoue, `parseEnv` retire les clés `VITE_FIREBASE_*` inconnues du schéma.

- [ ] **Step 3: Étendre le schéma dans `src/env.ts`**

Remplacer le bloc `envSchema` :

```ts
const envSchema = z.object({
  MODE: z.string().min(1),
  BASE_URL: z.string().min(1),
  DEV: z.boolean(),
  PROD: z.boolean(),
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
})
```

Le reste du fichier est inchangé.

- [ ] **Step 4: Injecter des valeurs factices dans l'environnement Vitest**

Dans `vite.config.ts`, ajouter la clé `env` dans le bloc `test`, juste après `setupFiles` :

```ts
    env: {
      VITE_FIREBASE_API_KEY: 'cle-de-test',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'projet-de-test',
      VITE_FIREBASE_APP_ID: '1:0:web:test',
    },
```

Ces valeurs ne servent qu'à faire passer la validation : aucun test n'ouvre de connexion Firebase.

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/env.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Créer `.env.example`**

```
# Configuration Firebase de l'application web.
# Ces valeurs ne sont pas des secrets : elles partent dans le bundle publie.
# Console Firebase -> Parametres du projet -> Vos applications -> Configuration SDK
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 7: Ignorer les journaux de l'émulateur**

Ajouter à la fin de `.gitignore` :

```
# Journaux des émulateurs Firebase
firebase-debug.log
firestore-debug.log
ui-debug.log
```

- [ ] **Step 8: Créer le `.env.local` de développement**

Copier `.env.example` vers `.env.local` et y coller les quatre valeurs du projet `covoiturage-college-915d5`, disponibles dans la console Firebase. `.env.local` est déjà ignoré par le motif `*.local` du `.gitignore` — vérifier avec `git status` qu'il n'apparaît pas.

- [ ] **Step 9: Lancer la suite complète, le lint et le typage**

Run: `npm test && npm run lint && npx tsc -b`
Expected: tout vert.

- [ ] **Step 10: Commit**

```bash
git add src/env.ts src/env.test.ts vite.config.ts .env.example .gitignore
git commit -m "feat: variables d'environnement Firebase validées par Zod"
```

---

### Task 5: Adaptateurs Firebase et composition dans `main.tsx`

Les trois seuls fichiers qui connaissent le SDK. Ils ne contiennent aucune décision : ce qui en serait une (lecture du document, normalisation de l'adresse, traduction des codes d'erreur) vit dans `src/auth/`, testé unitairement.

À l'issue de cette tâche, `AuthProvider` enveloppe l'application avec les vrais adaptateurs, mais la porte n'est pas encore installée : `npm run dev` affiche l'application comme avant. La tâche 6 branche la porte.

**Files:**
- Modify: `package.json` (dépendance `firebase`)
- Create: `src/auth/memberDocument.ts`
- Test: `src/auth/memberDocument.test.ts`
- Create: `src/firebase/app.ts`
- Create: `src/firebase/firebaseAuth.ts`
- Create: `src/firebase/firebaseMembers.ts`
- Modify: `src/main.tsx`
- Modify: `vite.config.ts` (exclusion de couverture)

**Interfaces:**
- Consumes: de la tâche 1 — `AuthPort`, `MemberRepository`, `Identity`, `Member`, `SignInOutcome`, `normalizeEmail`, `toSignInOutcome`, `readErrorCode` ; de la tâche 2 — `AuthProvider` ; de la tâche 4 — `env`.
- Produces:
  - `src/auth/memberDocument.ts` : `toMember(email: string, data: unknown): Member`.
  - `src/firebase/firebaseAuth.ts` : `firebaseAuthPort: AuthPort`.
  - `src/firebase/firebaseMembers.ts` : `firebaseMemberRepository: MemberRepository`.

- [ ] **Step 1: Installer le SDK Firebase**

Run: `npm install firebase@12.19.0`
Expected: `package.json` gagne `"firebase": "^12.19.0"` dans `dependencies`.

- [ ] **Step 2: Écrire le test qui échoue pour la lecture d'un document membre**

Créer `src/auth/memberDocument.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { toMember } from './memberDocument'

describe('toMember', () => {
  it('lit un document complet', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie', role: 'parent' })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'Sophie',
      role: 'parent',
    })
  })

  it('accepte le rôle enfant', () => {
    expect(toMember('lou@exemple.fr', { firstName: 'Lou', role: 'child' }).role).toBe('child')
  })

  it('retombe sur la partie locale de l\'adresse quand le prénom manque', () => {
    expect(toMember('sophie.martin@exemple.fr', { role: 'parent' }).firstName).toBe('sophie.martin')
  })

  it('retombe sur le rôle parent quand le rôle est absent', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 'Sophie' }).role).toBe('parent')
  })

  it('n\'exclut personne à cause d\'un document mal formé', () => {
    expect(toMember('sophie@exemple.fr', { firstName: 42, role: 'roi' })).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
    })
  })

  it('tolère un document vide', () => {
    expect(toMember('sophie@exemple.fr', {})).toEqual({
      email: 'sophie@exemple.fr',
      firstName: 'sophie',
      role: 'parent',
    })
  })
})
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/memberDocument.test.ts`
Expected: FAIL — `Failed to resolve import "./memberDocument"`.

- [ ] **Step 4: Créer `src/auth/memberDocument.ts`**

```ts
import { z } from 'zod'
import type { Member } from './ports'

const memberDocumentSchema = z.object({
  firstName: z.string().min(1).optional(),
  role: z.enum(['parent', 'child']).optional(),
})

/**
 * L'existence du document *est* l'autorisation : un document mal formé ne doit
 * jamais exclure un membre légitime. La lecture est donc tolérante et retombe
 * sur des valeurs par défaut plutôt que d'échouer.
 */
export function toMember(email: string, data: unknown): Member {
  const result = memberDocumentSchema.safeParse(data)
  const parsed = result.success ? result.data : {}
  const localPart = email.split('@')[0] ?? email

  return {
    email,
    firstName: parsed.firstName ?? localPart,
    role: parsed.role ?? 'parent',
  }
}
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

Run: `npm test -- src/auth/memberDocument.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Créer `src/firebase/app.ts`**

```ts
import { initializeApp } from 'firebase/app'
import { env } from '../env'

export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
```

- [ ] **Step 7: Créer `src/firebase/firebaseAuth.ts`**

```ts
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
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
```

- [ ] **Step 8: Créer `src/firebase/firebaseMembers.ts`**

```ts
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { normalizeEmail } from '../auth/email'
import { toMember } from '../auth/memberDocument'
import type { MemberRepository } from '../auth/ports'
import { firebaseApp } from './app'

const database = getFirestore(firebaseApp)

export const firebaseMemberRepository: MemberRepository = {
  async find(email) {
    const identifier = normalizeEmail(email)
    const snapshot = await getDoc(doc(database, 'members', identifier))
    return snapshot.exists() ? toMember(identifier, snapshot.data()) : null
  },
}
```

- [ ] **Step 9: Composer les adaptateurs dans `src/main.tsx`**

Remplacer entièrement le fichier :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AuthProvider } from './auth/AuthProvider'
import { env } from './env'
import { firebaseAuthPort } from './firebase/firebaseAuth'
import { firebaseMemberRepository } from './firebase/firebaseMembers'
import { routes } from './routes/routes'

const router = createBrowserRouter(routes, { basename: env.BASE_URL })

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("L'élément racine #root est introuvable.")
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider auth={firebaseAuthPort} members={firebaseMemberRepository}>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 10: Exclure les adaptateurs de la couverture**

Dans `vite.config.ts`, remplacer la ligne `exclude` du bloc `coverage` :

```ts
      exclude: ['src/main.tsx', 'src/test/**', 'src/firebase/**'],
```

Ces trois fichiers ne contiennent aucune décision. L'exclusion fait tenir la règle : le jour où l'un d'eux mérite un test, c'est qu'il porte de la logique, et cette logique appartient à `src/auth/`.

- [ ] **Step 11: Vérifier que le build passe et que l'application démarre**

Run: `npm run build`
Expected: succès. `tsc -b` puis `vite build` sans erreur.

Run: `npm run dev`, ouvrir la page dans un navigateur.
Expected: l'application d'accueil s'affiche comme avant — la porte n'est pas encore posée. Aucune erreur Firebase dans la console du navigateur. Arrêter le serveur.

- [ ] **Step 12: Lancer la suite complète, le lint et la couverture**

Run: `npm test && npm run lint && npm run test:coverage`
Expected: tout vert, seuil de 80 % franchi.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json src/auth/memberDocument.ts src/auth/memberDocument.test.ts \
  src/firebase/app.ts src/firebase/firebaseAuth.ts src/firebase/firebaseMembers.ts \
  src/main.tsx vite.config.ts
git commit -m "feat: adaptateurs Firebase pour l'authentification et la liste blanche"
```

---

### Task 6: `AuthGate`, table de routes et `renderRoute` asynchrone

La porte entre en service. Les suites existantes gagnent un `await` devant chaque appel à `renderRoute` : le scénario par défaut étant « membre connecté », ce qu'elles vérifiaient reste vérifié.

**Files:**
- Create: `src/auth/AuthGate.tsx`
- Modify: `src/routes/routes.tsx`
- Modify: `src/test/renderRoute.tsx`
- Modify: `src/routes/routes.test.tsx`
- Modify: `src/components/Layout.test.tsx`
- Test: `src/auth/AuthGate.test.tsx`

**Interfaces:**
- Consumes: des tâches 1 à 3 — `useAuth`, les quatre écrans, `AuthProvider`, les constructeurs de `src/test/fakeAuth.ts`.
- Produces:
  - `src/auth/AuthGate.tsx` : `AuthGate()`.
  - `src/test/renderRoute.tsx` : `renderRoute(initialPath: string, options?: { auth?: AuthScenario; waitForSettled?: boolean }): Promise<RenderResult>`. **Asynchrone** — tout appel doit être précédé d'`await`.

- [ ] **Step 1: Écrire le test qui échoue pour la porte**

Créer `src/auth/AuthGate.test.tsx` :

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { denied, failingLookup, loading, member, signedOut } from '../test/fakeAuth'
import { renderRoute } from '../test/renderRoute'

describe('AuthGate', () => {
  it('affiche l\'écran de chargement tant que l\'accès n\'est pas tranché', async () => {
    await renderRoute('/', { auth: loading(), waitForSettled: false })
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('affiche l\'écran de connexion quand personne n\'est connecté', async () => {
    await renderRoute('/', { auth: signedOut() })
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('affiche l\'accès refusé pour un compte hors liste', async () => {
    await renderRoute('/', { auth: denied('inconnu@exemple.fr') })
    expect(screen.getByRole('heading', { level: 1, name: /accès refusé/i })).toBeInTheDocument()
    expect(screen.getByText('inconnu@exemple.fr')).toBeInTheDocument()
  })

  it('affiche l\'écran d\'erreur quand la vérification échoue', async () => {
    await renderRoute('/', { auth: failingLookup() })
    expect(screen.getByRole('heading', { level: 1, name: /problème technique/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
  })

  it('laisse passer un membre vers l\'application', async () => {
    await renderRoute('/', { auth: member() })
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /covoiturage collège/i })).toBeInTheDocument()
  })

  it('protège aussi les adresses inconnues, sans révéler la page 404', async () => {
    await renderRoute('/adresse-inexistante', { auth: signedOut() })
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: /page introuvable/i })).toBeNull()
  })

  it('conserve l\'adresse demandée pendant la connexion', async () => {
    await renderRoute('/adresse-inexistante', { auth: member() })
    expect(screen.getByRole('heading', { level: 1, name: /page introuvable/i })).toBeInTheDocument()
  })

  it('n\'affiche qu\'un seul titre de niveau 1 sur chaque écran de la porte', async () => {
    await renderRoute('/', { auth: denied('inconnu@exemple.fr') })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('permet d\'atteindre le bouton de connexion au clavier', async () => {
    const user = userEvent.setup()
    await renderRoute('/', { auth: signedOut() })
    await user.tab()
    expect(screen.getByRole('button', { name: /se connecter avec google/i })).toHaveFocus()
  })
})
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

Run: `npm test -- src/auth/AuthGate.test.tsx`
Expected: FAIL — `renderRoute` n'accepte pas de second argument et ne retourne pas de promesse.

- [ ] **Step 3: Créer `src/auth/AuthGate.tsx`**

```tsx
import { Outlet } from 'react-router'
import { AccessDeniedScreen } from './AccessDeniedScreen'
import { ErrorScreen } from './ErrorScreen'
import { LoadingScreen } from './LoadingScreen'
import { SignInScreen } from './SignInScreen'
import { useAuth } from './useAuth'

/**
 * La porte unique. Le `default` n'est pas défensif : il force TypeScript à
 * refuser la compilation si un état est ajouté sans écran correspondant.
 */
export function AuthGate() {
  const { state } = useAuth()

  switch (state.status) {
    case 'loading':
      return <LoadingScreen />
    case 'signedOut':
      return <SignInScreen failure={state.failure} />
    case 'denied':
      return <AccessDeniedScreen email={state.email} />
    case 'error':
      return <ErrorScreen />
    case 'member':
      return <Outlet />
    default: {
      const exhaustive: never = state
      return exhaustive
    }
  }
}
```

- [ ] **Step 4: Envelopper la table de routes**

Remplacer entièrement `src/routes/routes.tsx` :

```tsx
import type { RouteObject } from 'react-router'
import { AuthGate } from '../auth/AuthGate'
import { Layout } from '../components/Layout'
import { Home } from './Home'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <AuthGate />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]
```

- [ ] **Step 5: Rendre `renderRoute` asynchrone**

Remplacer entièrement `src/test/renderRoute.tsx` :

```tsx
import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../auth/AuthProvider'
import { routes } from '../routes/routes'
import { type AuthScenario, member } from './fakeAuth'

type RenderRouteOptions = {
  auth?: AuthScenario
  /** À passer à `false` pour observer l'écran de chargement lui-même. */
  waitForSettled?: boolean
}

export async function renderRoute(initialPath: string, options: RenderRouteOptions = {}) {
  const scenario = options.auth ?? member()
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })

  const result = render(
    <AuthProvider auth={scenario.auth} members={scenario.members}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )

  if (options.waitForSettled !== false) {
    // On attend l'absence, pas la disparition : selon le scénario, l'état peut
    // être résolu dès le premier rendu et l'indicateur n'apparaître jamais.
    await waitFor(() => {
      if (result.queryByRole('status') !== null) {
        throw new Error("L'écran de chargement est toujours affiché.")
      }
    })
  }

  return result
}
```

- [ ] **Step 6: Mettre les suites existantes à jour**

Dans `src/routes/routes.test.tsx` et `src/components/Layout.test.tsx`, rendre chaque `it` asynchrone et préfixer chaque appel `renderRoute(...)` d'un `await`. Exemple pour le premier test de `routes.test.tsx` :

```ts
  it("rend la page d'accueil sur /", async () => {
    await renderRoute('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /covoiturage collège/i }),
    ).toBeInTheDocument()
  })
```

Et pour le bloc `describe.each` de `Layout.test.tsx` :

```ts
describe.each(['/', '/adresse-inexistante'])('hiérarchie des titres sur %s', (path) => {
  it("ne contient qu'un seul titre de niveau 1 et ne saute aucun niveau", async () => {
    await renderRoute(path)
    const levels = screen.getAllByRole('heading').map((heading) => Number(heading.tagName.slice(1)))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1)
    }
  })
})
```

Les `it` qui utilisent déjà `async` (ceux avec `userEvent`) n'ont besoin que du `await` devant `renderRoute`.

- [ ] **Step 7: Lancer la suite complète**

Run: `npm test`
Expected: PASS, toutes suites confondues. Un échec de type « impossible de trouver le rôle `banner` » signale un `await` oublié devant un `renderRoute`.

- [ ] **Step 8: Lancer le lint, le typage et la couverture**

Run: `npm run lint && npx tsc -b && npm run test:coverage`
Expected: tout vert, seuil de 80 % franchi.

- [ ] **Step 9: Vérifier la porte dans le navigateur**

Run: `npm run dev`
Expected: la page affiche brièvement « Vérification de votre accès », puis l'écran de connexion avec le bouton Google. La page d'accueil n'est pas atteignable. Arrêter le serveur.

La connexion elle-même ne peut pas encore aboutir : les règles Firestore déployées interdisent toute lecture (tâche 8) et aucune fiche membre n'existe. Un clic sur le bouton mènera à l'écran d'erreur — c'est le comportement attendu à ce stade.

- [ ] **Step 10: Commit**

```bash
git add src/auth/AuthGate.tsx src/auth/AuthGate.test.tsx src/routes/routes.tsx \
  src/routes/routes.test.tsx src/components/Layout.test.tsx src/test/renderRoute.tsx
git commit -m "feat: porte d'authentification sur l'ensemble des routes"
```

---

### Task 7: Déconnexion dans `Layout`

Le prénom du membre et un bouton de déconnexion, placés **après** la `<nav>` dans l'ordre du DOM. Cet ordre n'est pas indifférent : il préserve l'ordre de tabulation vérifié par la suite existante, où deux `Tab` doivent atteindre le lien « Accueil ».

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: de la tâche 2 — `useAuth` ; de la tâche 6 — `renderRoute` asynchrone ; de la tâche 2 — `member`, `defaultMember` de `src/test/fakeAuth.ts`.
- Produces: rien de nouveau pour les tâches suivantes.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter ces trois tests dans le premier `describe('Layout', ...)` de `src/components/Layout.test.tsx` :

```ts
  it('affiche le prénom du membre connecté', async () => {
    await renderRoute('/', { auth: member({ firstName: 'Karim' }) })
    expect(screen.getByText(/connecté en tant que karim/i)).toBeInTheDocument()
  })

  it('propose un bouton de déconnexion', async () => {
    await renderRoute('/')
    expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument()
  })

  it('déconnecte le membre au clic', async () => {
    const user = userEvent.setup()
    const scenario = member()
    await renderRoute('/', { auth: scenario })
    await user.click(screen.getByRole('button', { name: /se déconnecter/i }))
    expect(scenario.signOutCalls()).toBe(1)
  })
```

Compléter l'import en tête de fichier :

```ts
import { member } from '../test/fakeAuth'
```

- [ ] **Step 2: Lancer les tests et vérifier qu'ils échouent**

Run: `npm test -- src/components/Layout.test.tsx`
Expected: FAIL — `Unable to find an element with the text: /connecté en tant que karim/i`.

- [ ] **Step 3: Modifier `src/components/Layout.tsx`**

Remplacer entièrement le fichier :

```tsx
import type { MouseEvent } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

const MAIN_ID = 'main'

export function Layout() {
  const { state, signOut } = useAuth()
  const firstName = state.status === 'member' ? state.member.firstName : null

  function focusMain(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    document.getElementById(MAIN_ID)?.focus()
  }

  return (
    <>
      <header>
        <a className="skip-link" href={`#${MAIN_ID}`} onClick={focusMain}>
          Aller au contenu
        </a>
        <nav aria-label="Navigation principale">
          <ul>
            <li>
              <NavLink to="/">Accueil</NavLink>
            </li>
          </ul>
        </nav>
        {/*
          Après la nav, délibérément : l'ordre de tabulation vérifié par les
          tests mène du lien d'évitement au menu, puis seulement ici.
        */}
        {firstName === null ? null : (
          <div>
            <span>Connecté en tant que {firstName}</span>
            <button type="button" onClick={() => void signOut()}>
              Se déconnecter
            </button>
          </div>
        )}
      </header>
      <main id={MAIN_ID} tabIndex={-1}>
        <Outlet />
      </main>
      <footer>
        <p>Projet personnel, licence GPL-3.0.</p>
      </footer>
    </>
  )
}
```

- [ ] **Step 4: Lancer les tests et vérifier qu'ils passent**

Run: `npm test -- src/components/Layout.test.tsx`
Expected: PASS, y compris le test d'ordre de tabulation existant qui atteint « Accueil » en deux `Tab`.

- [ ] **Step 5: Lancer la suite complète, le lint, le typage et la couverture**

Run: `npm test && npm run lint && npx tsc -b && npm run test:coverage`
Expected: tout vert, seuil de 80 % franchi.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat: déconnexion et identité du membre dans le layout"
```

---

### Task 8: Règles Firestore et tests d'émulateur

Les règles sont le seul rempart entre huit adresses e-mail et le monde entier. Sept tests contre l'émulateur les verrouillent.

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `vitest.rules.config.ts`
- Test: `tests/firestore.rules.test.ts`
- Modify: `vite.config.ts` (restreindre l'inclusion de la suite principale)
- Modify: `package.json` (dépendance de test et deux scripts)

**Interfaces:**
- Consumes: rien du code applicatif. Cette tâche est indépendante des tâches 1 à 7 et pourrait être menée en parallèle.
- Produces: `npm run test:rules` et `npm run rules:deploy`.

**Note sur le typage :** `tests/` est hors de l'`include` de `tsconfig.app.json` et reste donc hors du graphe de `tsc -b`. Ces sept tests ne sont pas typés à la compilation — Vitest les transpile sans vérifier. C'est un choix assumé : les tirer dans le projet TypeScript imposerait une configuration `lib` distincte pour un gain nul sur sept assertions dont l'échec est immédiat et lisible.

- [ ] **Step 1: Installer la bibliothèque de test des règles**

Run: `npm install --save-dev @firebase/rules-unit-testing@5.0.2`
Expected: `package.json` gagne l'entrée dans `devDependencies`.

`firebase-tools` n'est **pas** installé : il est invoqué par `npx --yes firebase-tools@15`, comme `netlify-cli` l'est déjà dans la CI.

- [ ] **Step 2: Créer `.firebaserc`**

```json
{
  "projects": {
    "default": "covoiturage-college-915d5"
  }
}
```

- [ ] **Step 3: Créer `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": false
    }
  }
}
```

- [ ] **Step 4: Créer `vitest.rules.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Empêcher la suite principale de ramasser les tests de règles**

Dans `vite.config.ts`, ajouter la clé `include` en première position du bloc `test` :

```ts
    include: ['src/**/*.test.{ts,tsx}'],
```

Sans cette ligne, le motif par défaut de Vitest attraperait `tests/firestore.rules.test.ts`, l'exécuterait en `jsdom` sans émulateur, et il échouerait.

- [ ] **Step 6: Ajouter les deux scripts npm**

Dans `package.json`, après `"test:coverage"` :

```json
    "test:rules": "npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only firestore \"vitest run -c vitest.rules.config.ts\"",
    "rules:deploy": "npx --yes firebase-tools@15 deploy --only firestore:rules",
```

Le préfixe `demo-` est la convention Firebase pour un identifiant de projet qui n'existe que dans l'émulateur : aucun appel ne peut partir vers la production, même par erreur de configuration.

- [ ] **Step 7: Écrire les tests qui échouent**

Créer `tests/firestore.rules.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const MEMBER = 'sophie.martin@exemple.fr'
const OTHER_MEMBER = 'karim.benali@exemple.fr'
const OUTSIDER = 'inconnu@exemple.fr'

let testEnv: RulesTestEnvironment

function asSignedIn(email: string, emailVerified = true) {
  return testEnv
    .authenticatedContext(email, { email, email_verified: emailVerified })
    .firestore()
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-covoiturage',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await setDoc(doc(database, 'members', MEMBER), { firstName: 'Sophie', role: 'parent' })
    await setDoc(doc(database, 'members', OTHER_MEMBER), { firstName: 'Karim', role: 'parent' })
  })
})

describe('règles de la collection members', () => {
  it('autorise un membre à lire sa propre fiche', async () => {
    await assertSucceeds(getDoc(doc(asSignedIn(MEMBER), 'members', MEMBER)))
  })

  it("refuse à un membre la lecture de la fiche d'un autre", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER), 'members', OTHER_MEMBER)))
  })

  it('laisse un compte hors liste lire sa fiche absente sans erreur', async () => {
    const snapshot = await assertSucceeds(getDoc(doc(asSignedIn(OUTSIDER), 'members', OUTSIDER)))
    expect(snapshot.exists()).toBe(false)
  })

  it('refuse la lecture à un visiteur non authentifié', async () => {
    const database = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(database, 'members', MEMBER)))
  })

  it("refuse la lecture à un compte dont l'adresse n'est pas vérifiée", async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER, false), 'members', MEMBER)))
  })

  it("refuse l'énumération de la collection", async () => {
    await assertFails(getDocs(collection(asSignedIn(MEMBER), 'members')))
  })

  it("refuse toute écriture depuis le client", async () => {
    await assertFails(
      setDoc(doc(asSignedIn(MEMBER), 'members', MEMBER), { firstName: 'Pirate', role: 'parent' }),
    )
  })
})

describe('règles des collections à venir', () => {
  it('refuse la lecture d\'une collection métier non déclarée', async () => {
    await assertFails(getDoc(doc(asSignedIn(MEMBER), 'trips', 'trajet-quelconque')))
  })
})
```

- [ ] **Step 8: Lancer les tests et vérifier qu'ils échouent**

Run: `npm run test:rules`
Expected: FAIL — `Error: ENOENT: no such file or directory, open 'firestore.rules'`.

Si la commande échoue avant les tests avec un message sur Java, vérifier `java -version`.

- [ ] **Step 9: Créer `firestore.rules`**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isVerifiedUser() {
      return request.auth != null
        && request.auth.token.email != null
        && request.auth.token.email_verified == true;
    }

    match /members/{memberEmail} {
      // Chacun ne lit que sa propre fiche, et seulement par identifiant.
      allow get: if isVerifiedUser()
                 && memberEmail == request.auth.token.email.lower();
      // Explicites bien que redondants : dire non tout haut vaut mieux
      // que compter sur le refus par defaut. `list` refuse interdit
      // d'aspirer les adresses des voisins, meme a un membre autorise.
      allow list: if false;
      allow write: if false;
    }

    // Les collections metier a venir naissent fermees. Ce bloc ne restreint
    // pas la regle ci-dessus : les regles Firestore s'unissent, un `allow`
    // specifique l'emporte.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 10: Lancer les tests et vérifier qu'ils passent**

Run: `npm run test:rules`
Expected: PASS, 8 tests. L'émulateur démarre, exécute la suite, puis s'arrête.

- [ ] **Step 11: Vérifier que la suite principale ignore bien les tests de règles**

Run: `npm test`
Expected: aucune mention de `firestore.rules.test.ts` dans la sortie. Le nombre de fichiers de test correspond aux seuls fichiers de `src/`.

- [ ] **Step 12: Déployer les règles**

Run: `npm run rules:deploy`
Expected: `Deploy complete!`. La console Firebase, onglet Règles, affiche désormais le contenu de `firestore.rules`.

Cette étape écrase les règles actuelles (`allow read, write: if false`). Les nouvelles règles sont strictement plus permissives sur un seul point : la lecture par un membre de sa propre fiche.

- [ ] **Step 13: Lancer le lint**

Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 14: Commit**

```bash
git add firestore.rules firebase.json .firebaserc vitest.rules.config.ts \
  tests/firestore.rules.test.ts vite.config.ts package.json package-lock.json
git commit -m "feat: règles de sécurité Firestore et tests d'émulateur"
```

---

### Task 9: Intégration continue et documentation

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: de la tâche 4 — les quatre variables ; de la tâche 8 — `npm run test:rules`.
- Produces: rien pour du code ultérieur.

- [ ] **Step 1: Ajouter les variables de build et les tests de règles au job `verify`**

Dans `.github/workflows/ci.yml`, remplacer le bloc d'étapes du job `verify` situé entre `- run: npm ci` et `- uses: actions/upload-artifact@v7` :

```yaml
      - run: npm ci
      - run: npm run lint
      # Vite fige les VITE_* dans le bundle au moment du build. Sans ces
      # variables ici, le dist/ publie par le job deploy partirait avec des
      # undefined et l'application ne demarrerait pas.
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ vars.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}
      - run: npm run test:coverage
      # L'emulateur Firestore tourne sur la JVM.
      - uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: '21'
      - run: npm run test:rules
```

Le reste du fichier — `concurrency`, `permissions`, l'`upload-artifact` et tout le job `deploy` — est inchangé.

- [ ] **Step 2: Déclarer les quatre variables dans GitHub**

Dans *Settings → Secrets and variables → Actions → onglet Variables*, créer `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` et `VITE_FIREBASE_APP_ID` avec les valeurs du `.env.local`.

Onglet **Variables**, pas *Secrets* : ces valeurs partent dans le bundle public, et un secret masqué compliquerait le diagnostic sans rien protéger.

- [ ] **Step 3: Documenter dans le README**

Ajouter une section `## Authentification`, avant `## Règle de contribution` :

```markdown
## Authentification

Toutes les pages sont derrière une authentification Google : il n'existe aucune
page publique. L'accès est restreint à une liste blanche nominative stockée dans
Firestore.

### Ajouter ou retirer une personne

Dans la console Firebase, collection `members` :

| Élément | Valeur |
| --- | --- |
| Identifiant du document | l'adresse Google, **en minuscules** |
| `firstName` | le prénom affiché dans l'application |
| `role` | `parent` ou `child` |

Retirer un accès, c'est supprimer le document. Aucune écriture n'est possible
depuis l'application : les règles l'interdisent.

**L'identifiant doit être en minuscules.** L'application cherche le document par
identifiant exact : une fiche saisie `Sophie.Martin@gmail.com` ne sera jamais
trouvée. En cas de doute, l'écran « Accès refusé » affiche l'adresse exacte que
l'application a cherchée — il suffit de la comparer à l'identifiant du document.

### Variables d'environnement

| Nom | Où |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `.env.local` en local, *Variables* GitHub Actions en CI |
| `VITE_FIREBASE_AUTH_DOMAIN` | idem |
| `VITE_FIREBASE_PROJECT_ID` | idem |
| `VITE_FIREBASE_APP_ID` | idem |

Ces valeurs ne sont pas des secrets : elles partent dans le bundle que n'importe
qui télécharge. Partir de `.env.example` et les copier depuis *Console Firebase →
Paramètres du projet → Vos applications → Configuration SDK*.

Elles sont requises **au build** : sans elles dans le job `verify`, le `dist/`
publié en production contiendrait des `undefined`.

### Règles de sécurité

`firestore.rules` est versionné. Après modification :

```bash
npm run test:rules    # 8 tests contre l'émulateur — nécessite Java
npm run rules:deploy  # publie les règles
```

Java est requis pour l'émulateur Firestore (`brew install temurin`).

### Domaines autorisés

Toute nouvelle origine servant l'application doit être déclarée dans *Firebase →
Authentication → Paramètres → Domaines autorisés*, sinon la connexion Google y
échoue. `localhost` et `covoiturage-college.netlify.app` y sont déjà. Les
*deploy previews* Netlify, si elles sont activées un jour, sortent sur d'autres
sous-domaines et ne sont pas couvertes.
```

Compléter aussi le tableau des commandes en tête de README :

```markdown
| `npm run test:rules` | Tests des règles Firestore contre l'émulateur (Java requis) |
| `npm run rules:deploy` | Déploie `firestore.rules` sur le projet Firebase |
```

- [ ] **Step 4: Vérifier l'ensemble de la chaîne en local**

Run: `npm run lint && npx tsc -b && npm run build && npm run test:coverage && npm run test:rules`
Expected: tout vert.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: tests des règles Firestore et configuration Firebase au build"
```

- [ ] **Step 6: Ouvrir la pull request et vérifier la CI**

Pousser la branche et ouvrir une pull request. Le job `verify` doit passer entièrement, y compris l'étape `npm run test:rules`. Un échec du build sur une variable manquante signale que l'étape 2 n'a pas été faite.

---

## Recette manuelle

À exécuter par le propriétaire du projet après la tâche 9, dans cet ordre. Aucun agent ne peut la mener : elle demande un vrai compte Google et un vrai téléphone.

- [ ] **Créer sa propre fiche membre** dans la console Firebase : collection `members`, identifiant = sa propre adresse Google en minuscules, `firstName` renseigné, `role` = `parent`.
- [ ] **Se connecter en local.** `npm run dev`, ouvrir la page : l'écran de connexion apparaît. Cliquer sur « Se connecter avec Google », choisir son compte. L'application d'accueil s'affiche, le header indique « Connecté en tant que … ».
- [ ] **Vérifier la persistance.** Recharger la page : l'application s'affiche directement, sans repasser par l'écran de connexion.
- [ ] **Vérifier le refus.** Se déconnecter, puis se reconnecter avec un compte Google qui n'est pas dans `members`. L'écran « Accès refusé » doit afficher l'adresse exacte de ce compte. Cliquer sur « Essayer avec un autre compte » ramène à l'écran de connexion.
- [ ] **Vérifier le lien profond.** Se déconnecter, ouvrir directement `/adresse-inexistante` : l'écran de connexion s'affiche à cette URL. Après connexion, la page 404 s'affiche — l'adresse demandée a été conservée.
- [ ] **Vérifier en production.** Après merge sur `main` et déploiement Netlify, refaire la connexion depuis un téléphone, sur `covoiturage-college.netlify.app`. Un échec ici avec un message sur le domaine signale un domaine autorisé manquant côté Firebase.
- [ ] **Créer les fiches des voisins** une fois la production validée, et leur transmettre le lien **par SMS ou WhatsApp**. Éviter Facebook Messenger et Instagram : leurs navigateurs intégrés sont des webviews embarquées, où Google refuse l'authentification OAuth quelle que soit la méthode employée.
