# Bus du soir — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inscrire l'horaire confirmé du bus du soir — un seul bus, sortie 17:00, arrivée au Centre-bourg 17:30 — dans la documentation du dépôt et dans les données de production.

**Architecture:** Aucun code ne change : les bus du soir sont une donnée d'import (`busDuSoir` → `timetables.eveningBuses`), et le moteur place déjà au Centre-bourg l'enfant dont la sortie correspond à un bus. La PR aligne la spec et le fichier d'exemple. Les données réelles (`data/import.json`, hors dépôt) passent de 17:45 à 17:30 par une **nouvelle version** de l'emploi du temps, car une version déjà en vigueur n'est jamais réécrite.

**Tech Stack:** script d'import existant (`npm run import`, `tsx`, `firebase-admin`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md` (sections « Trajets par défaut », « Modèle Firestore », « Script d'import », « Actions manuelles »)

## Global Constraints

- **Horaire confirmé par le propriétaire du projet (2026-10-02) :** un seul bus du soir, `{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }`. Le bus de 16:00 n'existe pas.
- **Historique protégé (spec) :** « refus de réécrire une version `timetables` dont `valableDu` est aujourd'hui ou avant ». La correction s'importe avec un `valableDu` **postérieur au jour de l'import**.
- **Confidentialité (spec) :** `data/import.json` ne quitte jamais la machine et n'entre pas dans la PR. Seuls les deux champs ci-dessous y changent ; aucun prénom, aucune adresse, aucun horaire d'enfant n'est recopié dans un document du dépôt, un commit ou un message.
- **Pas de nettoyage automatique (spec) :** un covoiturage déjà pris à 17:45 sur un jour à venir reste affiché, avec son conducteur, jusqu'à ce que celui-ci l'annule.
- Textes en français, commits Conventional Commits en français, jamais de `Co-Authored-By`. PR sous le compte `caedes` (`docs/rules/compte-github.md`).

## Review Focus

- **Covoiturages déjà pris à 17:45 sur les jours à venir :** après l'import, chacun devient « Personne à transporter · [Prénom] conduit encore », et un trajet de 17:30 apparaît « Personne pour l'instant ». Le conducteur doit prendre le 17:30, puis annuler son 17:45. Contrôle : parcourir « Cette semaine » et « Semaine prochaine » après l'import (tâche 2, étape 6).
- **Import lancé un autre jour que prévu :** un `valableDu` égal ou antérieur au jour de l'import est refusé par le script. Contrôle : la simulation (tâche 2, étape 4) affiche l'erreur « prend effet le … ou avant » si la date est mauvaise.
- **Aujourd'hui et les jours passés gardent 17:45 :** c'est voulu, l'historique n'est pas réécrit, et ces jours sont verrouillés de toute façon.
- **Enfants en permanence jusqu'à 17:00 :** la permanence enregistre l'heure de sortie, pas l'arrivée. Ils rejoignent le trajet de 17:30 sans réglage à refaire. Contrôle : visible à l'étape 6.
- **Mauvaise cible d'import :** la première ligne du script indique `Cible : émulateur …` ou `Cible : PRODUCTION, projet …`. Contrôle : la lire avant `--apply` (tâche 2, étape 5).

---

### Task 1: Aligner la spec et le fichier d'exemple (PR)

**Files:**
- Modify: `docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md`, `data/import.example.json`
- Test: `scripts/import/schema.test.ts` (existant : il valide `data/import.example.json`)

**Interfaces:**
- Consumes: rien.
- Produces: la spec et l'exemple décrivent un seul bus du soir, 17:00 → 17:30.

- [ ] **Step 1: Créer la branche**

```bash
git switch main && git pull --ff-only && git switch -c docs/bus-du-soir
```

- [ ] **Step 2: Corriger la section « Trajets par défaut » de la spec**

Remplacer :

```markdown
Les bus du soir sont une donnée d'import (`eveningBuses`). Valeurs provisoires, à
confirmer par le propriétaire du projet :

| Sortie des cours | Arrivée au Centre-bourg |
| --- | --- |
| 16:00 | 16:55 |
| 17:00 | 17:30 |
```

par :

```markdown
Les bus du soir sont une donnée d'import (`eveningBuses`). Il n'y en a qu'un, confirmé
par le propriétaire du projet le 2026-10-02 :

| Sortie des cours | Arrivée au Centre-bourg |
| --- | --- |
| 17:00 | 17:30 |
```

- [ ] **Step 3: Corriger les deux exemples de la spec**

Section « Modèle Firestore », remplacer `  eveningBuses: [{ classEnd: "16:00", arrival: "16:55" }, …]` par `  eveningBuses: [{ classEnd: "17:00", arrival: "17:30" }]`.

Section « Script d'import › Format d'entrée », remplacer :

```json
  "busDuSoir": [
    { "sortie": "16:00", "arriveeCentreBourg": "16:55" },
    { "sortie": "17:00", "arriveeCentreBourg": "17:30" }
  ],
```

par :

```json
  "busDuSoir": [{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }],
```

- [ ] **Step 4: Mettre à jour les actions manuelles de la spec**

Dans « Actions manuelles », remplacer l'étape `3. Confirmer les horaires des bus du soir et les reporter dans `busDuSoir`.` par :

```markdown
3. Reporter le bus du soir dans `busDuSoir` : sortie 17:00, arrivée au Centre-bourg 17:30.
   Un changement d'horaire en cours d'année s'importe comme une nouvelle version, avec un
   `valableDu` postérieur au jour de l'import.
```

- [ ] **Step 5: Corriger le fichier d'exemple**

Dans `data/import.example.json`, remplacer les quatre lignes de `busDuSoir` par :

```json
  "busDuSoir": [{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }],
```

Le reste du fichier (enfants et familles fictifs) ne change pas.

- [ ] **Step 6: Vérifier**

Run: `npx biome check --write data docs && npx vitest run scripts/import && npm run lint`
Expected: PASS. Le test de `schema.test.ts` qui lit `data/import.example.json` le valide toujours. Biome peut reformater le tableau JSON : garder sa mise en forme.

Les fixtures de test (`scripts/import/fixtures.ts`, `src/test/planningFixtures.ts`) gardent leurs bus fictifs : elles éprouvent la logique, plusieurs bus et doublons compris, et ne décrivent pas la réalité.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-09-26-planning-covoiturage-design.md data/import.example.json docs/superpowers/plans/2026-10-02-bus-du-soir.md
git commit -m "docs: inscrire l'unique bus du soir, 17:00 → 17:30"
```

---

### Task 2: Corriger les données réelles et les importer (propriétaire, hors PR)

**Files:**
- Modify: `data/import.json` (local, ignoré par Git — jamais commité)

**Interfaces:**
- Consumes: le script d'import et la procédure du README (« Changer d'emploi du temps »).
- Produces: une version `timetables/<valableDu>` en production, avec `eveningBuses: [{ classEnd: "17:00", arrival: "17:30" }]`.

- [ ] **Step 1: Corriger l'arrivée du bus**

Dans `data/import.json`, `busDuSoir` devient `[{ "sortie": "17:00", "arriveeCentreBourg": "17:30" }]` (aujourd'hui 17:45).

- [ ] **Step 2: Dater la nouvelle version**

`valableDu` (aujourd'hui `2026-09-28`, déjà en vigueur) prend la date du **lendemain du jour de l'import** : `2026-10-03` pour un import le 2026-10-02. Rien d'autre ne change dans le fichier.

- [ ] **Step 3: Essayer contre l'émulateur**

```bash
npx --yes firebase-tools@15 emulators:exec --project demo-covoiturage --only firestore \
  "npm run import -- data/import.json --apply"
```

Expected: la première ligne indique `Cible : émulateur`, le fichier est validé, la version `2026-10-03` est écrite.

- [ ] **Step 4: Simuler contre la production**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/covoiturage-college/service-account.json
npm run import -- data/import.json
```

Expected: `Cible : PRODUCTION, projet …` ; une nouvelle version d'emploi du temps `2026-10-03` ; aucune fiche `members` modifiée (`~`) ni absente (`!`). Sinon, s'arrêter et relire le fichier.

- [ ] **Step 5: Appliquer**

```bash
npm run import -- data/import.json --apply
```

Relire la ligne `Cible` avant de valider.

- [ ] **Step 6: Contrôler dans l'application**

Sur « Cette semaine » puis « Semaine prochaine », chaque jour sauf le mercredi :
- les enfants qui sortent à 17:00 sont sur `17:30 Centre-bourg → Maison` ;
- un ancien trajet de 17:45 déjà pris s'affiche « Personne à transporter · [Prénom] conduit encore ». Son conducteur prend le trajet de 17:30 (« Je prends »), puis annule celui de 17:45 (« Annuler »).

---

### Task 3: Pull request

- [ ] **Step 1: Vérification complète**

Run: `npm run lint && npm test && npm run build`
Expected: aucune violation, tous les tests verts, build OK.

- [ ] **Step 2: Rédiger le corps de la PR**

Écrire dans un fichier du dossier de travail temporaire (hors dépôt), par exemple `pr-body.md` :

```markdown
## Objet

Le propriétaire du projet a confirmé l'horaire du bus du soir : il n'y en a qu'un, sortie
17:00, arrivée au Centre-bourg 17:30. La spec et `data/import.example.json` décrivaient
encore deux bus provisoires (16:00 → 16:55 et 17:00 → 17:30).

La PR embarque le plan (`docs/superpowers/plans/2026-10-02-bus-du-soir.md`).

## Contenu

- Spec : le tableau des bus du soir, les exemples du modèle Firestore et du format d'import,
  et l'étape « bus du soir » des actions manuelles.
- `data/import.example.json` : un seul bus.
- Aucun code ne change : le bus est une donnée d'import.

## Vérifications

- `npm run lint`, `npm test`, `npm run build` : OK. Le test qui valide le fichier d'exemple passe.

## Hors PR

Les données réelles (`data/import.json`, hors dépôt) passent de 17:45 à 17:30 par une
nouvelle version d'emploi du temps, importée à part.

- [ ] Après l'import, un trajet de 17:45 déjà pris sur un jour à venir s'affiche « Personne
  à transporter » : son conducteur prend le trajet de 17:30, puis annule celui de 17:45.
```

- [ ] **Step 3: Pousser et ouvrir la PR**

```bash
git push -u origin docs/bus-du-soir
OWNER=$(git remote get-url origin | sed -E 's#.*[:/]([^/]+)/[^/]+$#\1#')
GH_TOKEN=$(gh auth token --user "$OWNER") gh pr create --base main --head docs/bus-du-soir \
  --title "docs: un seul bus du soir, 17:00 → 17:30" --body-file pr-body.md
```

`pr-body.md` désigne le fichier écrit à l'étape 2, avec son chemin réel.
