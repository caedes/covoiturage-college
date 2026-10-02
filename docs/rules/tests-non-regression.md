# Tests de non-régression

Les TNR pilotent la vraie application dans Chromium, sur un écran de téléphone, contre les
émulateurs Firebase Auth et Firestore. Ils protègent le comportement de l'application, pas
les données de production. Spec : `docs/superpowers/specs/2026-10-02-tests-non-regression-design.md`.

## Écrire un TNR

- **Un fichier par comportement**, `e2e/<comportement>.spec.ts`, nom de test en français :
  ce que voit ou fait un parent (« ramène au Centre-bourg par le bus de 17:30 l'enfant qui
  sort à 17:00 »).
- **Repartir d'une base vide** : `test.beforeAll` appelle `resetEmulators()` puis
  `seedFixture()` (`e2e/support/emulators.ts`).
- **Données fictives uniquement**, dans `e2e/fixtures/`. Aucun vrai prénom, aucune vraie
  adresse, aucun vrai horaire d'enfant : le dépôt est public. Adresses en `@exemple.fr`.
- **Date figée** : `page.clock.setFixedTime(MONDAY)` (`e2e/support/session.ts`) avant toute
  navigation. Jamais `page.clock.install`, qui figerait les minuteries de Firestore.
- **Connexion** par `signInAs(page, email)`, avec l'adresse d'un parent du jeu fictif.
- **Sélecteurs accessibles** : `getByRole` et noms accessibles, comme les tests Vitest.
  Seule la page de connexion de l'émulateur se pilote par ses identifiants.
- **Prouver qu'il sait échouer** : avant de commiter un TNR sur un comportement qui existe
  déjà, casser la donnée ou le code qu'il protège, le voir échouer, puis rétablir.

## Limite : les tests qui écrivent

Les règles Firestore jugent le verrou et l'horizon avec l'horloge réelle de l'émulateur. Un
test qui écrit (« Je prends », une option d'enfant) sur une date figée sera refusé dès que
cette date sera passée. Ces tests utilisent la vraie date et choisissent dynamiquement un
jour d'école hors vacances, dans les 14 jours.

## Réseau

La page de connexion de l'émulateur Auth charge ses scripts depuis `unpkg.com` : les TNR ont
besoin d'un accès à internet, en local comme en CI.
