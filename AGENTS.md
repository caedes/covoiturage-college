# AGENTS.md

Consignes pour les agents de code (Claude Code, Codex, Cursor…) travaillant sur ce dépôt.

## Le projet

Covoiturage collège — application d'entraide entre parents pour organiser les trajets
domicile ↔ collège. Le dépôt contient le socle technique et la porte d'authentification.
Aucune fonctionnalité métier — trajets, disponibilités, inscriptions — n'est encore
implémentée.

## Commandes

Le tableau complet est dans le [README](./README.md#commandes). Celles qui comptent
avant de pousser :

```bash
npm run lint         # Biome, lint et formatage
npm run build        # typecheck puis build de production
npm test             # suite de tests, une passe
npm run test:rules   # règles Firestore contre l'émulateur (Java requis)
```

## Architecture

- **Socle** — React 19 sur Vite 8, TypeScript en mode strict.
- **Routage** — `react-router` v8, table de routes déclarative dans `src/routes/routes.tsx`.
- **UI** — Tailwind v4 et shadcn, thème « Trajets collège » dans `src/index.css` (clair
  uniquement, jetons `success`, `warning`, `child-1` à `child-3`, police `font-heading`).
  Les composants shadcn se génèrent avec `npx shadcn@latest add <nom>` dans
  `src/components/atoms/ui/` ; ils sont exclus de la couverture et ne se modifient pas à
  la main sans raison. Vérifier après génération que `cn` est importé de `@/lib/utils` :
  la CLI l'a déjà résolu vers un paquet npm homonyme.
- **Atomic Design** — `src/components/` est rangé en `atoms`, `molecules`, `organisms`,
  `templates`, `pages`. Un fichier importe son niveau ou un niveau inférieur, jamais un
  niveau supérieur ; sous les pages, aucun import de valeur depuis `src/auth/` ou
  `src/planning/` — les composants ne reçoivent que des props. Aucun composant n'importe
  Firebase. `src/components/architecture.test.ts` vérifie ces trois règles.
- **Authentification** — connexion Google via Firebase Auth. Le domaine ne connaît que
  les ports déclarés dans `src/auth/ports.ts` (`AuthPort`, `MemberRepository`) ; les
  adaptateurs Firebase vivent dans `src/firebase/`. Une fonctionnalité qui a besoin de
  l'identité passe par un port, jamais par le SDK Firebase directement.
- **Autorisation** — l'accès est réservé aux membres inscrits : la fiche
  `members/{email}` fait foi. `firestore.rules` n'accorde que le `get` de sa propre
  fiche — ni `list`, ni `write`, et les collections à venir naissent fermées.
- **Environnement** — les variables sont validées par Zod dans `src/env.ts` ; toute
  nouvelle variable passe par ce schéma plutôt que par un accès direct à `import.meta.env`.
- **Tests** — Vitest et Testing Library sur jsdom. `src/test/renderRoute.tsx` monte la
  vraie table de routes, `src/test/renderWithAuth.tsx` et `src/test/fakeAuth.ts`
  fournissent des doubles : les tests ne touchent jamais Firebase. Les règles Firestore
  ont leur propre suite, jouée contre l'émulateur (`tests/firestore.rules.test.ts`).
- **Qualité** — Biome pour le lint et le format, appliqué aux fichiers stagés par le
  hook `pre-commit` (Husky). La suite de tests n'est pas lancée au commit.
- **Déploiement** — Netlify, via le job `deploy` du workflow CI sur merge vers `main`.
  Les règles Firestore se déploient à part, avec `npm run rules:deploy`.
- **Conception** — les specs vivent dans `docs/superpowers/specs/`, les plans
  d'implémentation dans `docs/superpowers/plans/`.

## Règle de contribution

Toute nouvelle vue doit être couverte par un test de structure accessible : `h1` unique,
landmarks, navigation au clavier. Détail dans le [README](./README.md#règle-de-contribution).

## Règles

Une règle par fichier dans `docs/rules/`. Elles sont importées ici, donc chargées avec
ce fichier — pas seulement référencées.

- @docs/rules/compte-github.md — sous quel compte tournent les commandes `gh`
- @docs/rules/langue.md — français pour ce qui se lit, anglais pour le code
- @docs/rules/commits.md — format des messages de commit
