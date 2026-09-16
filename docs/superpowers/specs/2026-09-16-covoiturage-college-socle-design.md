# Socle technique — covoiturage-college

Date : 2026-09-16
Statut : validé

## Objet

Poser l'ossature technique du projet covoiturage-college (gestion des trajets
domicile ↔ collège entre parents). Aucune fonctionnalité métier : pas d'écran de
planning, pas de modèle de données de trajet, pas de logique d'appariement. Le
livrable est un projet qui démarre, une structure sémantique accessible, et une
suite de tests qui verrouille cette structure.

## Décisions

Trois arbitrages ont été tranchés pendant le cadrage et s'écartent du brief
initial. Ils sont consignés ici pour éviter qu'on les rejoue plus tard.

**Pas de dépendance axe.** Le brief demandait un test axe par route. Les tests
d'accessibilité s'appuient à la place sur les requêtes par rôle et nom
accessible de Testing Library. `vitest-axe` est bloqué en 0.1.0 avec un axe-core
obsolète, et `jest-axe` impose un shim de types dans un projet Vitest ; pour la
taille de ce projet, l'API accessible de Testing Library suffit. La règle du
README est reformulée en conséquence : toute nouvelle vue doit être couverte par
un test de structure accessible.

**Zod valide les variables d'environnement.** C'est le seul usage non-métier qui
tienne debout dans un socle sans données : `src/env.ts` parse `import.meta.env`
et exporte un objet typé. Le démarrage échoue tôt si une variable manque, et
c'est le point d'extension naturel quand une API arrivera.

**Husky en pre-commit uniquement.** Format et lint à chaque commit, pas de tests
en hook. On s'en remet à la CI et à la discipline pour la suite Vitest.

## Architecture

### Table de routes comme source unique

La table est déclarée en tableau nu dans `src/routes/routes.tsx`. Elle est
consommée par `createBrowserRouter` dans `main.tsx` et par `createMemoryRouter`
dans les tests. Les tests traversent donc la vraie table, y compris le catch-all
404, au lieu de monter les composants à la main.

L'alternative écartée — router construit directement dans `main.tsx`, tests
montant les composants isolément — obligeait de toute façon à envelopper chaque
test dans un router pour les `Link`, sans jamais vérifier que `/route-inconnue`
résout réellement sur la 404.

### Arborescence

```
README.md  LICENSE  index.html  package.json
biome.json  tsconfig.json  tsconfig.node.json  vite.config.ts
.husky/pre-commit
src/
├── main.tsx            bootstrap : createBrowserRouter + RouterProvider
├── env.ts              schéma Zod sur import.meta.env, export typé
├── index.css           strict minimum : skip link + styles de focus
├── components/
│   └── Layout.tsx      header / nav / main#main / footer
├── routes/
│   ├── routes.tsx      la table, importée par main.tsx et par les tests
│   ├── Home.tsx
│   └── NotFound.tsx
└── test/
    ├── setupTests.ts   jest-dom + cleanup, chargé une seule fois
    └── renderRoute.tsx helper : createMemoryRouter sur la vraie table
```

`src/test/` ne contient que l'infrastructure de test. Les specs sont colocalisées
avec le code qu'elles couvrent (`Layout.test.tsx` à côté de `Layout.tsx`).
Aucun dossier vide : chaque répertoire listé ci-dessus contient au moins un
fichier à la livraison.

### Layout et accessibilité

`lang="fr"` sur `<html>` dans `index.html`. Un layout unique, dans l'ordre du
DOM :

1. `header` — contient le skip link « Aller au contenu » en tout premier élément
   focusable, puis `nav` avec `aria-label="Navigation principale"`
2. `main id="main" tabIndex={-1}` — reçoit l'`Outlet`
3. `footer`

Chaque route fournit son unique `h1`. Le layout n'en contient aucun.

Le skip link porte un `onClick` qui appelle explicitement `focus()` sur `#main`.
Ce n'est pas du code superflu : c'est ce qui corrige le comportement erratique du
saut par fragment selon les navigateurs, et c'est la seule façon de tester le
fonctionnement réel du lien sous jsdom, où la navigation par ancre n'existe pas.

`src/index.css` se limite au nécessaire : masquage du skip link hors focus, et
styles de focus visibles. Pas de mise en forme décorative.

## Suite de tests

Sept cibles, aucune fonctionnalité métier testée.

| Cible | Vérifie |
|---|---|
| `Home` | rend le contexte du projet, un seul `h1` |
| `NotFound` | `/url-inconnue` résout sur la 404 via la vraie table |
| skip link | présent, premier dans l'ordre de tabulation, `href` pointe sur l'`id` de `main`, activation → focus sur `main` |
| titres | un seul `h1` par route, pas de saut de niveau (`getAllByRole('heading')`) |
| clavier | `Tab` parcourt les liens du nav dans l'ordre du DOM, `Entrée` change de route |
| landmark nav | `getByRole('navigation', { name: /navigation principale/i })` |
| `env.ts` | le schéma accepte un env valide, rejette un env invalide |

Environnement jsdom. `src/test/setupTests.ts` est le seul point d'enregistrement
des matchers : il importe `@testing-library/jest-dom/vitest` une fois et
configure le cleanup. Aucun test ne réenregistre de matcher.

## Outillage

**Versions** (compatibilité vérifiée au cadrage) : Vite 8, `@vitejs/plugin-react`
6, React 19.3, React Router 8.4, Vitest 5.0.1, `@vitest/coverage-v8` 5.0.1,
`@testing-library/react` 16.3, `jest-dom` 7, `user-event` 14.6, Biome 2.5,
Husky 9.1, Zod.

**Biome** assure formatage et qualité. `lint` lance `biome check .`, `format`
lance `biome format --write .`. Le hook `pre-commit` lance
`biome check --staged --write`, natif depuis Biome 2.5 : pas de `lint-staged` à
installer.

**Scripts npm** : `dev`, `build` (`tsc -b && vite build`), `preview`, `test`
(`vitest run`), `test:watch` (`vitest`), `test:coverage` (`vitest run
--coverage`), `lint`, `format`, `prepare` (`husky`).

**Couverture** : provider v8, seuil à 80 % sur les quatre métriques (lignes,
instructions, fonctions, branches), avec `main.tsx` et les fichiers de config
exclus. Une fois le bootstrap exclu, tout le reste est couvert par la suite
structurelle ; 80 % est un plancher qui se déclenche quand du code non testé
arrive, pas un chiffre de façade.

## README

Court. Contexte du projet en trois lignes, tableau des commandes, lien vers
`LICENSE` (GPL-3.0), et la règle en évidence : **toute nouvelle vue doit être
couverte par un test de structure accessible.**

## Hors périmètre

Pas de librairie UI, pas de framework CSS, pas de state manager, pas de mock
d'API. Pas de composant « exemple » ni de code commenté en réserve. Pas de CI,
pas de déploiement, pas d'authentification : ces sujets relèvent de lots
ultérieurs.

## Critères d'acceptation

- `npm run dev` démarre et sert `/` et une URL inconnue sans erreur console
- `npm test` passe au vert, sans configuration manuelle préalable
- `npm run build` produit un bundle sans erreur TypeScript
- `npm run lint` ne remonte aucune violation
- `npm run test:coverage` passe le seuil de 80 %
- un commit déclenche le hook Husky et reformate les fichiers stagés
