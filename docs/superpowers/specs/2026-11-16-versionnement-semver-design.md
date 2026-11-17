# Versionnement SemVer — design

## Pourquoi

L'application est en production chez les parents, mais `package.json` est resté à `0.0.0`
et aucun tag n'existe. Le propriétaire veut :

- **savoir quelle version a un parent**, pour déboguer ou faire une démo ;
- **montrer aux parents que l'application a changé**.

Le numéro doit donc suivre SemVer et être visible à droite du titre. Un clic sur le numéro
ouvre les notes de cette version. Une version regroupe une ou plusieurs PR : le
propriétaire décide quand livrer en fusionnant une PR de release.

## Objectifs

- Les PR de travail (`feat`, `fix`…) s'accumulent sur `main` sans rien livrer.
- Une PR de release, tenue à jour automatiquement, propose la prochaine version selon
  SemVer d'après les commits accumulés, avec son changelog. Exemple : PR-a (`fix`) et PR-b
  (`feat`) donnent une mineure.
- Fusionner la PR de release crée la version (`package.json`, `CHANGELOG.md`, tag `vX.Y.Z`,
  release GitHub), puis déploie en production.
- Le numéro affiché correspond toujours au code que les parents ont entre les mains.
- L'historique est reconstruit comme si le versionnement avait existé depuis le début :
  tags, releases GitHub et `CHANGELOG.md`.
- Les messages de commit sont contrôlés, en local et en CI, pour que le calcul reste juste.

## Non-objectifs

- Pas de publication npm (le paquet reste `private`).
- Pas de journal des nouveautés dans l'application : le lien vers la release GitHub en
  tient lieu.
- Pas de réécriture des commits passés.
- Pas de protection de branche ajoutée sur `main`.

## Anti-objectifs

- Un numéro affiché qui ne correspond pas au code déployé.
- Une version publiée (tag, release) ou déployée pour du code dont les tests ont échoué.
- Un numéro qui monte alors que les parents ne voient rien de changé. Le propriétaire veut
  que le numéro raconte l'évolution de l'application.

## Approches envisagées

- **Release Please, déploiement à la release** : retenue par le propriétaire. Il voulait
  livrer plusieurs PR ensemble dans une PR de release, ce qui est le fonctionnement même de
  Release Please. La version est déjà dans le commit de release quand on build, donc aucun
  calcul anticipé de la version n'est nécessaire.
- **Release Please, déploiement à chaque fusion** : écartée. Les nouveautés partiraient
  avec l'ancien numéro jusqu'à la release suivante, ce qui fausse le débogage.
- **semantic-release, une version par PR** : retenue dans un premier temps, puis abandonnée
  quand le propriétaire a voulu regrouper les PR dans une release.
- **Version montée dans la PR elle-même** : écartée. Deux PR parallèles (fréquentes avec
  les worktrees d'agents) se disputent le même numéro.

## Conception

### 1. Rattrapage de l'historique (une seule fois)

Règles appliquées rétroactivement, une PR à la fois, au commit de fusion de la PR :
`feat` donne une mineure, `fix` seul donne un patch, une PR sans `feat` ni `fix` ne
change pas la version. Aucune rupture n'existe dans l'historique. Le socle poussé
directement sur `main` avant la PR #1 vaut `0.1.0`. La mise en service chez les parents,
PR #11, vaut `1.0.0` (choix du propriétaire). Chaque PR passée est traitée comme si elle
avait été livrée seule.

| Version | Point de l'historique |
|---------|-----------------------|
| 0.1.0 | dernier commit poussé sur `main` avant la PR #1 (socle) |
| 0.2.0 | PR #3, authentification Google |
| 0.3.0 | PR #6, socle UI |
| 0.4.0 | PR #7, données et import |
| 0.5.0 | PR #8, moteur de planning |
| 0.6.0 | PR #9, planning en lecture seule |
| 0.7.0 | PR #10, je prends / annuler |
| **1.0.0** | PR #11, options des enfants : mise en service |
| 1.1.0 | PR #15, TNR et bus de 17:30 |
| 1.2.0 | PR #16, barre de navigation du bas |
| 1.3.0 | PR #17, application installable |
| 1.4.0 | PR #18, développement sur émulateurs |
| (aucune) | PR #1, #2, #4, #5, #19 : `ci`, `docs`, `chore` seulement |

Le rattrapage produit :

- les tags annotés `v0.1.0` à `v1.4.0` sur ces commits ;
- une release GitHub par tag. Ses notes listent les commits `feat` et `fix` de la PR
  (lien vers la PR). La date de la release sera celle de sa création, pas la date
  historique, car GitHub ne permet pas de l'antidater. La date historique figure dans
  `CHANGELOG.md` ;
- un `CHANGELOG.md` à la racine, version la plus récente en haut, une section par version
  datée du jour de fusion de la PR, au même format que celui qu'écrira ensuite Release
  Please (sections « Nouveautés » et « Corrections ») ;
- `package.json`, `package-lock.json` et `.release-please-manifest.json` à `1.4.0`.

Le rattrapage est un script versionné qui calcule la table à partir des PR (via `gh`) et
l'affiche avant d'agir. Il a un mode simulation par défaut. Il refuse d'agir si un tag `v*`
existe déjà.

**Quand et par qui (choix du propriétaire).** Le rattrapage a lieu dès cette branche,
avant la fusion de la PR, et sous le contrôle du propriétaire. Le script tourne d'abord en
simulation et le propriétaire relit la table. Il ne pose ensuite les tags et les releases
qu'avec son accord explicite, puisque c'est une action publique et permanente. Les tags ne
pointent que sur des commits déjà présents sur `main` : rien ne dépend de la branche. Le
script se contente d'écrire `CHANGELOG.md` et la version `1.4.0` dans les fichiers, qui
sont commités dans la PR. Il ne commite et ne pousse rien sur `main`. La release `v1.4.0`
doit exister avant la fusion : c'est elle que Release Please prend comme point de départ.
Une fois la PR fusionnée, Release Please ouvre une PR de release qui propose la `1.5.0`,
puisque l'affichage du numéro est un `feat`.

### 2. Release Please

- Type `node`, configuration dans `release-please-config.json` et
  `.release-please-manifest.json`. Tags `vX.Y.Z`, ce qui est le défaut.
- `feat` donne une mineure, `fix` et `perf` un patch, `!` ou `BREAKING CHANGE` une majeure.
- Changelog et notes avec des titres en français : « Nouveautés », « Corrections »,
  « Performances ». Les autres types sont masqués.
- La PR de release met à jour `package.json`, `package-lock.json`, `CHANGELOG.md` et le
  manifeste. Son titre par défaut (`chore(main): release X.Y.Z`) respecte commitlint.
- Le dépôt doit autoriser GitHub Actions à créer des PR (réglage
  « Allow GitHub Actions to create and approve pull requests »). Le propriétaire l'a
  activé le 2026-11-17.

### 3. CI et déploiement

À chaque push sur `main` :

1. **verify** : inchangé (lint, build, tests unitaires, règles, TNR, garde du bundle,
   artefact `dist`). Le build lit la version dans `package.json`.
2. **release-please** (après verify, droits `contents: write` et `pull-requests: write`) :
   - si le push vient de la fusion de la PR de release, il crée le tag et la release
     GitHub ;
   - sinon, il crée ou met à jour la PR de release.

   Comme il passe après verify, aucune version n'est publiée pour du code rouge.
3. **deploy** (après release-please) : seulement si une release vient d'être créée. Il
   déploie l'artefact `dist` de verify : ce bundle a été construit depuis le commit de
   release, il porte donc le bon numéro et c'est bien le bundle testé. Les autres pushes
   ne déploient plus rien.

Notre choix : le CI ne tourne pas sur la PR de release. Une PR ouverte avec
`GITHUB_TOKEN` ne déclenche pas les workflows, et cette PR ne touche que la version et le
changelog. Le contrôle complet a lieu de toute façon au push sur `main`, avant le tag et
le déploiement.

**Correctif urgent :** on fusionne le `fix`, puis la PR de release, qui propose un patch.

### 4. Affichage

- Vite injecte au build la version de `package.json`. En développement local, c'est la même
  source.
- Le numéro s'affiche au format `v1.4.0`, à droite du titre, aligné sur la ligne de base,
  en petit, en `text-muted-foreground`, sans graisse. Il est placé hors du `<h1>`, pour que
  le titre reste « Covoiturage » pour les lecteurs d'écran.
- **Le numéro est un lien** vers la release GitHub de cette version,
  `https://github.com/caedes/covoiturage-college/releases/tag/vX.Y.Z` (le dépôt est
  public). Il s'ouvre dans un nouvel onglet. Son libellé accessible est du type « Notes de
  la version 1.4.0 (nouvel onglet) ». La zone cliquable doit rester confortable au doigt
  malgré la petite taille du texte.
- Le titre et son numéro deviennent un seul composant, utilisé par `PlanningTemplate`, par
  les états chargement et erreur de `PlanningPage`, qui le dupliquent aujourd'hui, et par
  l'écran de connexion (`AuthTemplate`, titre « Covoiturage collège »). Sur ce dernier
  écran, le numéro sert à déboguer un parent bloqué à la connexion (choix du
  propriétaire). Le composant reçoit le titre et la version en props, selon la règle des
  composants qui ne reçoivent que des props.

```
Covoiturage v1.4.0
            ‾‾‾‾‾‾ lien vers la release, petit, gris, même ligne de base
```

### 5. Contrôle des messages de commit

- **commitlint**, config `@commitlint/config-conventional`, branché sur un hook Husky
  `commit-msg` (à côté du `pre-commit` actuel).
- **En CI**, sur chaque PR, tous les commits de la PR sont vérifiés. Avec la fusion en
  rebase, chacun arrive sur `main` et compte dans le calcul.
- Types admis : ceux de `docs/rules/commits.md` (`feat`, `fix`, `docs`, `ci`, `refactor`,
  `test`, `chore`), plus `style` (déjà employé), `perf` et `build`. Le gitmoji en tête de
  description reste accepté, tout comme le français accentué.
- `docs/rules/commits.md` gagne une règle : `feat` et `fix` sont réservés à ce qu'un parent
  peut voir ou subir. L'outillage, les tests et le CI passent en `chore`, `test`, `ci` ou
  `build`, même quand c'est une « fonctionnalité » pour le développeur. La règle explique
  aussi comment marquer une rupture (`!`) et rappelle que livrer, c'est fusionner la PR de
  release.

## Laissé au constructeur

- Le nom et l'emplacement du script de rattrapage, et la façon d'en tester la logique.
- La façon de conditionner `deploy` à la création d'une release (sortie de l'action
  Release Please).
- Les réglages fins de commitlint (longueurs de ligne, casse) compatibles avec
  l'historique récent.
- La mise à jour du README et d'`AGENTS.md` (commandes, CI, livraison, règle des commits).
