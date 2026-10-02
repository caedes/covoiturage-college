# Tests de non-régression (TNR) — covoiturage-college

Date : 2026-10-02
Statut : validé en conversation, en relecture

## Objet

Installer des tests de non-régression de bout en bout, écrits avec Playwright, que l'on
lance de la même façon en local et dans la CI. Ils pilotent la vraie application dans un
navigateur et protègent son **comportement** : connexion, planning, et plus tard
conducteurs et options des enfants. Le propriétaire du projet ajoutera ensuite d'autres
TNR pour valider les comportements qu'il veut mettre en place. Cette spec pose
l'infrastructure, sa documentation et un premier test, sur l'horaire du bus du soir
(17:00 → 17:30).

## Ce que les TNR ne font pas

- **Ils ne contrôlent pas les données de production.** Ils tournent sur des données
  fictives, dans des émulateurs. Une erreur dans `data/import.json` ou un import qui
  n'atteint pas la production leur échappe ; c'est l'affaire de la simulation d'import
  (`npm run import -- data/import.json`) et du contrôle manuel.
- **Ils ne remplacent pas les tests Vitest.** Le moteur, les composants et la page restent
  testés par Vitest et Testing Library, avec les faux dépôts en mémoire. Les TNR couvrent
  ce que ces tests ne voient pas : la vraie connexion, les adaptateurs Firebase, les règles
  Firestore, le bundle construit par Vite et un vrai navigateur.

## Décisions

**Émulateurs Firebase plutôt que Google.** Automatiser la vraie fenêtre de connexion Google
est une impasse : Google détecte et bloque les navigateurs pilotés, peut demander une
validation en deux étapes, et il faudrait garder les identifiants d'un vrai compte dans la
CI. L'émulateur Firebase Auth fournit une fausse page de connexion Google : l'application
garde le même code (`signInWithPopup`) et Playwright y saisit une adresse fictive.
L'émulateur Firestore charge les vraies règles (`firestore.rules`). Les deux tournent sur
la JVM, déjà installée en CI pour `npm run test:rules`.

**Un mode de build `e2e`, inoffensif par construction.** `vite build --mode e2e` lit
`.env.e2e`, versionné, avec de fausses valeurs et le projet `demo-covoiturage`. Un
identifiant de projet `demo-…` ne peut parler qu'à des émulateurs : même mal configuré, ce
mode n'atteint jamais la production. Le branchement sur les émulateurs n'existe que dans ce
mode ; `import.meta.env.MODE` étant remplacé par une constante au build, il disparaît du
bundle de production.

**Approches écartées.** Playwright sur l'application avec les faux dépôts en mémoire :
rapide, mais redondant avec les tests de page Vitest et aveugle aux adaptateurs, aux règles
et à la connexion. Playwright contre un vrai projet Firebase et un compte Google de test :
bloqué par Google, demande des secrets en CI, et le plan Spark n'offre pas de second projet
propre.

**Chromium seul, sur un écran de téléphone.** L'application est mobile d'abord. Un seul
moteur garde la CI courte ; ajouter WebKit (Safari, iPhone) reste une ligne de
configuration, hors de cette spec.

## Architecture

```
npm run test:e2e
└─ firebase emulators:exec --only auth,firestore      (Auth 9099, Firestore 8080)
   └─ playwright test
      ├─ webServer : vite build --mode e2e && vite preview --mode e2e   (port 4173)
      └─ e2e/*.spec.ts
         ├─ avant chaque fichier : base vidée, puis données fictives importées
         │   (npm run import -- e2e/fixtures/import.json --apply, vers l'émulateur)
         └─ navigateur : horloge figée, connexion par la page de l'émulateur, assertions
```

| Élément | Rôle |
| --- | --- |
| `firebase.json` | ajoute l'émulateur Auth (port 9099) à côté de Firestore (8080) |
| `.env.e2e` | fausses valeurs Firebase, projet `demo-covoiturage` |
| `src/firebase/app.ts` | en mode `e2e` seulement, branche Auth et Firestore sur `127.0.0.1` |
| `e2e/fixtures/import.json` | familles fictives au format d'import, un seul bus 17:00 → 17:30 |
| `e2e/support/` | remise à zéro des émulateurs, import des données, connexion, horloge |
| `e2e/*.spec.ts` | les TNR |
| `playwright.config.ts` | Chromium sur un écran de téléphone, `webServer`, rapport HTML |

- **Données fictives dédiées.** Le jeu de test `e2e/fixtures/import.json` est distinct de
  `data/import.example.json` : modifier l'exemple de la documentation ne doit pas casser un
  test. Il reprend les enfants fictifs Alice, Basile et Chloé. Les semaines A et B y ont le
  même emploi du temps, et Basile sort à 17:00 chaque lundi.
- **Import.** Le script d'import, déjà capable d'écrire dans l'émulateur
  (`FIRESTORE_EMULATOR_HOST`, que `emulators:exec` définit), crée les fiches `members` et
  l'emploi du temps. Les comptes Auth n'ont pas à être créés d'avance : l'émulateur les
  crée à la première connexion.
- **Isolation.** Avant chaque fichier de test, les deux émulateurs sont vidés par leurs
  points d'accès REST de remise à zéro, puis les données fictives sont réimportées.
- **Rangement.** Vitest ne ramasse que `src/**/*.test.*` et `scripts/**/*.test.ts` : les
  fichiers `e2e/*.spec.ts` restent hors de sa portée. Biome vérifie `e2e/`, et un
  `tsconfig.e2e.json` le typecheck.

## Le premier TNR : le bus du soir

`e2e/bus-du-soir.spec.ts` :

1. Fige l'horloge du navigateur au lundi 5 octobre 2026, 10 h à Paris.
2. Se connecte comme parent de Basile : clic sur « Se connecter avec Google », puis
   adresse fictive saisie dans la page de l'émulateur.
3. Vérifie que la section Retour du lundi affiche un trajet « 17:30 » « Centre-bourg →
   Maison » où figure Basile, et qu'aucun trajet n'est affiché à 17:45.

Il traverse tout le chemin réel : connexion, lecture de la fiche `members`, lecture de
l'emploi du temps sous les règles Firestore, calcul du placement par le moteur, affichage.

## Stabilité

- **Date figée.** `page.clock.setFixedTime` ne fige que la date : les minuteries restent
  réelles, sans quoi la connexion temps réel de Firestore se bloquerait. Sans date figée,
  le résultat dépendrait du jour du lancement (week-end, vacances, semaine A ou B).
- **Sélecteurs accessibles.** Les éléments se trouvent par leur rôle et leur nom
  (`getByRole`), comme dans les tests Vitest : un TNR protège aussi l'accessibilité.
- **Limite des tests qui écrivent.** Les règles Firestore jugent le verrou et l'horizon avec
  l'horloge réelle de l'émulateur. Un test qui écrit (« Je prends », une option d'enfant)
  sur une date figée sera refusé dès que cette date sera passée. Ces tests utiliseront la
  vraie date et choisiront dynamiquement un jour d'école hors vacances. Rien de tel n'est
  construit ici, faute de test qui en ait besoin.

## CI

- Le job `verify` gagne `npm run test:e2e`, après `npm run test:rules` (Java déjà
  installé), précédé de `npx playwright install --with-deps chromium`.
- En cas d'échec, le rapport HTML de Playwright et ses traces sont publiés en artefact,
  conservés 7 jours.
- Le job `deploy` dépend de `verify` : un TNR rouge bloque la mise en production.
- **Garde-fou** : après le build de production, une étape échoue si `dist/` contient
  `127.0.0.1:9099` ou `demo-covoiturage`.

## Documentation

- **README** : section « Tests de non-régression » — prérequis (Java, navigateur Playwright
  installé une fois), commande, lecture du rapport, mode interactif pour déboguer.
- **`docs/rules/tests-non-regression.md`**, importée dans AGENTS.md : comment écrire un TNR
  — emplacement, données fictives et confidentialité, date figée, sélecteurs accessibles,
  noms en français, isolation, et la limite des tests qui écrivent.
- **AGENTS.md** : commande dans la liste « avant de pousser », puce « Tests » complétée.

## Confidentialité

Le jeu `e2e/fixtures/import.json` suit la règle du dépôt : aucun vrai prénom, aucune vraie
adresse, aucun vrai horaire d'enfant. Seul l'horaire public du bus (17:00 → 17:30) y est
réel. Les adresses fictives sont en `@exemple.fr`.

## Périmètre

Inclus dans la PR #15, à côté de la mise à jour du bus du soir : infrastructure, mode
`e2e`, CI, documentation et premier TNR.

Hors périmètre : WebKit, les tests qui écrivent, tout contrôle des données de production.

## Risques

- **La page de connexion de l'émulateur évolue** avec `firebase-tools`. La version est
  épinglée (`firebase-tools@15`, comme pour `test:rules`) et la connexion vit dans une
  seule aide, `e2e/support/`.
- **`email_verified`.** Les règles exigent une adresse vérifiée. L'émulateur marque vérifiée
  l'adresse d'un compte Google, mais c'est à confirmer dès la première exécution. Sinon,
  l'aide de connexion la marque vérifiée par l'API de l'émulateur.
- **Durée de la CI** : une à deux minutes de plus, surtout pour le démarrage des émulateurs
  et l'installation de Chromium.
