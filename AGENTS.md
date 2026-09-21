# AGENTS.md

Consignes pour les agents de code (Claude Code, Codex, Cursor…) travaillant sur ce dépôt.

## Le projet

Covoiturage collège — application d'entraide entre parents pour organiser les trajets
domicile ↔ collège. À ce stade le dépôt ne contient que le socle technique : routage,
layout accessible et harnais de test. Aucune fonctionnalité métier n'est implémentée.

## Commandes

Le tableau complet est dans le [README](./README.md#commandes). Les trois qui comptent
avant de pousser :

```bash
npm run lint     # Biome, lint et formatage
npm run build    # typecheck puis build de production
npm test         # suite de tests, une passe
```

## Architecture

- **Socle** — React 19 sur Vite 8, TypeScript en mode strict.
- **Routage** — `react-router` v8, table de routes déclarative dans `src/routes/routes.tsx`.
- **Environnement** — les variables sont validées par Zod dans `src/env.ts` ; toute
  nouvelle variable passe par ce schéma plutôt que par un accès direct à `import.meta.env`.
- **Tests** — Vitest et Testing Library sur jsdom. Le helper `src/test/renderRoute.tsx`
  monte la vraie table de routes : une route ajoutée est testée telle qu'elle sera rendue.
- **Qualité** — Biome pour le lint et le format, appliqué aux fichiers stagés par le hook
  `pre-commit` (Husky). La suite de tests n'est pas lancée au commit.
- **Déploiement** — Netlify, via le job `deploy` du workflow CI sur merge vers `main`.
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
