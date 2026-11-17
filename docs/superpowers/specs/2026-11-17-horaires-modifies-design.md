# Horaires modifiés du jour — covoiturage-college

Date : 2026-11-17
Statut : validé (approche A et panneau validés sur maquette, design validé le 2026-11-17)

## Objet

Un parent a demandé à pouvoir changer, pour un jour donné, l'heure d'entrée ou de sortie de
son enfant : un professeur absent, un cours supprimé. Il faut pouvoir le dire dans
l'application pour voir tout de suite si le changement demande un covoiturage, et le faire
apparaître dans le planning pour qu'un parent puisse le prendre.

Aujourd'hui, le planning ne connaît que l'emploi du temps de la semaine A/B. L'aller est
toujours le bus de 07:40 au Centre-bourg, quelle que soit l'heure d'entrée. Le retour dépend
de l'heure de fin (bus du soir, collège, 13:15 le mercredi), et seule la permanence permet
de le décaler vers plus tard.

## Objectifs

- Depuis la pastille du prénom (barre « Présence »), un parent de l'enfant indique une heure
  d'entrée et/ou de sortie différente pour ce jour-là.
- **Entrée plus tardive** : l'enfant ne prend plus le bus de 07:40. Un trajet aller
  « Maison → Collège » en voiture apparaît à l'heure d'entrée. Les enfants qui entrent à la
  même heure le partagent, comme tout trajet.
- **Sortie modifiée** : le retour est recalculé avec la nouvelle heure, par la règle actuelle
  (`retourPlacement`) : bus du soir si l'heure correspond à un `classEnd`, sinon collège à
  l'heure de sortie.
- Le parent voit, dans le panneau, ce que son choix implique (quels trajets demanderont un
  conducteur).
- Les autres parents voient l'horaire modifié sur la pastille, sans pouvoir le changer.

## Non-objectifs

- **Règles permanentes par enfant** (exemple : un enfant qui sort chaque mercredi à 12:30 et
  déjeune en famille, sans intervention de personne). C'est un chantier distinct, le suivant
  (voir « Suite prévue »). Celui-ci ne doit pas le construire, mais ne doit pas non plus le
  rendre difficile.
- Saisie d'une heure libre, à la minute : on ne propose que les sonneries du collège.
- Modifier les horaires sur plusieurs jours d'un coup, ou de façon récurrente.
- Notifier les autres parents.

## Anti-objectifs

- Qu'un enfant présent disparaisse des trajets à cause d'une heure mal comprise par un
  endroit du code (c'est ce qui a fait écarter l'approche B).
- Qu'une valeur écrite par un client défaillant fasse planter ou fausse le planning : une
  heure invalide est ignorée, comme la permanence aujourd'hui.

## Approches

Le propriétaire a vu les deux premières sur maquette (écran identique, données et code
différents) et a retenu **A**.

1. **A — retenue. Deux heures facultatives dans `childDays`.** `start?` et `end?` s'ajoutent
   à `ChildDay`. L'enfant reste `presence: 'present'`. Le calcul remplace le créneau de
   l'emploi du temps par les heures modifiées. Le changement est purement additif : tout ce
   qui teste « présent ou non » reste intact.
2. **B — écartée. Une 4ᵉ valeur `presence: 'horairesModifies'`.** Le panneau et la donnée
   parlent la même langue, mais les endroits qui testent `presence === 'present'` (retraits
   des trajets, pastille pleine ou pointillée, libellés, offres de permanence, règles
   Firestore) doivent tous apprendre la nouvelle valeur. Un oubli retire un enfant présent
   des trajets.
3. **C — écartée. Réutiliser `permanence`.** La permanence ne sait que retarder la sortie.
   L'étendre vers plus tôt mélangerait deux idées et ne couvrirait pas l'entrée.

## Décisions du propriétaire

**Le panneau (maquette B du premier écran, choisie au clic).** Le panneau de présence garde
ses trois choix et en gagne un quatrième, placé en deuxième position :

```
( ) Présente · covoiturage normal
(•) Présente · horaires modifiés
    ENTRÉE   [08:25] 09:25 (10:35) 11:35 13:00 14:00 15:00 16:05
    SORTIE    09:20 10:20 11:30 (12:30) 13:55 14:55 [16:00] 17:00
    ⚠ Aller 10:35 et retour 12:30 au collège : il faudra des conducteurs.
( ) Absente du collège
( ) Au collège, mais sans covoiturage
```

`[ ]` en pointillé : l'horaire habituel du jour (emploi du temps). `( )` plein : l'heure
choisie. On touche une heure pour la choisir.

**Les heures proposées sont les sonneries du collège**, d'après le carnet de liaison :

| | Heures |
|---|---|
| Entrée (début d'une heure de cours) | 08:25 · 09:25 · 10:35 · 11:35 · 13:00 · 14:00 · 15:00 · 16:05 |
| Sortie (fin d'une heure de cours) | 09:20 · 10:20 · 11:30 · 12:30 · 13:55 · 14:55 · 16:00 · 17:00 |

Elles vivent dans le fichier d'import, à côté du bus du soir, et sont enregistrées avec
l'emploi du temps (`timetables/{validFrom}`). Un changement de sonneries passe par un nouvel
import, sans toucher au code.

**Mise en service par une nouvelle version d'emploi du temps.** L'import refuse de réécrire
la version en vigueur (`2026-09-01`, garde-fou de `scripts/import/plan.ts`). À la livraison,
on importe une nouvelle version, valable à partir du lendemain, avec les mêmes emplois du
temps et les sonneries. L'import ne change pas. La fonctionnalité est utilisable dès le
lendemain de cet import. Cette étape figure dans la checklist de livraison du plan, avec le
déploiement des règles Firestore (`npm run rules:deploy`), à faire avant la mise en ligne de
l'application. Les deux touchent la production : l'agent prépare `data/import.json` et le
vérifie sur les émulateurs, le propriétaire lance la simulation puis `--apply` (voir
`docs/rules/production.md`).

**Entrée plus tardive = covoiturage aller en voiture jusqu'au collège** à l'heure d'entrée
(confirmé par le propriétaire : c'est ce qui se passe dans la réalité).

**Sortie** : règle actuelle de placement du retour, appliquée à la nouvelle heure.

**Mercredi** : on garde 13:15 (repas au collège), sauf si l'enfant sort avant 11:30. Il faut
alors venir le chercher au collège à son heure de sortie.

**Permanence** : elle reste possible et se calcule à partir de la nouvelle heure de sortie.

**Durée** : un seul jour, comme les autres options. Revenir à « covoiturage normal » remet
l'emploi du temps habituel.

**Pastille** : elle affiche l'horaire du jour quand il est modifié, par exemple
« Alice · 10:35 – 12:30 ». Les autres parents la voient, sans pouvoir l'ouvrir.

## Conception

### Données

- `ChildDay` gagne `start?: Time` et `end?: Time`. Un champ absent signifie « comme
  l'emploi du temps ». Firestore refuse `undefined` : un champ revenu à la normale est omis,
  pas mis à `undefined` (même technique que `togglePermanence`).
- `Timetable` gagne `bellTimes: { starts: Time[]; ends: Time[] }`. Il est facultatif, car les
  versions déjà importées n'en ont pas. Sans sonneries, le 4ᵉ choix n'est pas proposé.
- Import : clé `sonneries: { entrees: [...], sorties: [...] }` dans le fichier, validée par
  Zod (format `HH:MM`, listes triées, sans doublon), traduite dans `translate.ts`.
  `data/import.example.json` et `e2e/fixtures/import.json` reçoivent une liste (fictive pour
  les TNR, selon `docs/rules/tests-non-regression.md`).

### Calcul (`src/planning/`)

- **Créneau du jour** : `slotOf` donne le créneau habituel. Une fonction donne ensuite le
  créneau effectif (`start`/`end` de `childDays`, quand ils sont valides, sinon l'habituel).
  Est valide une heure au format `HH:MM`, présente dans les sonneries de la version en
  vigueur, avec une entrée qui précède la sortie. Sinon, elle est ignorée, comme
  `validPermanence`.
- **Aller** : sans entrée modifiée, rien ne change (bus 07:40). Avec une entrée modifiée plus
  tardive que l'habituelle : `place: 'college'`, `time: start`. `describeTrip` donne déjà
  « Maison → Collège » en voiture.
- **Retour** : `effectiveExit` part de la sortie effective (modifiée ou habituelle), puis
  applique la permanence comme aujourd'hui (`permanence > sortie effective`).
- **Mercredi** : `retourPlacement` reçoit la règle « 13:15, sauf sortie avant 11:30 → collège
  à l'heure de sortie ». Le seuil 11:30 est une constante nommée.
- **Offres de permanence** : inchangées dans leur principe, elles partent de la sortie
  effective de chaque enfant.

### Options (`childOptions.ts`)

- `withHours(day, date, childId, start, end)` : `presence: 'present'`, garde `skipped`.
  Si l'une des heures égale l'habituelle, on l'omet. Si la sortie change, la permanence est
  effacée (voir « Choix de l'agent »). Si l'entrée choisie n'est pas avant la sortie, l'heure
  touchée l'emporte et l'autre revient à l'habituelle.
- `withPresence` efface `start`/`end`, comme il efface déjà le reste. Choisir « covoiturage
  normal » revient donc à l'emploi du temps habituel.

### Règles Firestore

`isChildDayShape` accepte `start` et `end` facultatifs, au format `HH:MM`. Les règles ne
lisent pas les sonneries : le calcul ignore une heure hors liste (voir Calcul).

### Interface

- `PresencePanel` : le 4ᵉ choix, puis deux groupes d'heures (entrée, sortie). Chaque groupe
  est un groupe de boutons à choix unique, accessible au clavier, avec un nom accessible
  (« Heure d'entrée d'Alice »). L'heure habituelle est en pointillé, l'heure choisie en
  plein. Chaque tap enregistre aussitôt, comme les autres choix du panneau. Choisir
  « horaires modifiés » sans toucher d'heure n'écrit rien de nouveau. Les heures déjà
  modifiées restent sélectionnées tant que le choix est actif.
- Message d'effet sous les heures, en couleur « avertissement », quand un trajet en voiture
  apparaît à cause du changement (aller au collège, retour au collège hors bus du soir).
  Pas de message si l'effet ne crée rien (exemple : sortie 17:00 → bus du soir).
- `presenceLabel` : « Alice · 10:35 – 12:30 » quand au moins une heure est modifiée. La
  pastille reste « active » (pleine) : l'enfant est présent.
- `DayChild` expose les heures effectives du jour et les sonneries proposées, pour que le
  panneau n'ait pas à les recalculer.

### Tests

- Vitest : calcul (entrée tardive → aller collège ; sortie avancée → retour collège ;
  sortie 17:00 → bus ; mercredi avant/après 11:30 ; heure hors sonneries ignorée ;
  permanence après une sortie modifiée), options, libellés, panneau, schéma et traduction
  de l'import.
- `npm run test:rules` : formats acceptés et refusés pour `start`/`end`.
- TNR Playwright (`e2e/horaires-modifies.spec.ts`), données fictives : un parent avance la
  sortie de son enfant, le trajet de retour au collège apparaît avec « Je prends ».

## Choix de l'agent, à vérifier

- **Une entrée modifiée crée un aller en voiture dès qu'elle est plus tardive que l'habituelle**,
  même si elle tombe à 09:25 (des enfants qui entrent habituellement à 09:25 prennent
  pourtant le bus de 07:40). Raison : modifier l'entrée signifie « il faut le déposer à cette
  heure ». Un parent qui préfère le bus ne touche pas l'entrée.
- **Le 4ᵉ choix se place en 2ᵉ position**, juste sous « covoiturage normal », car c'est aussi
  une présence.
- **Les règles Firestore valident le format, pas l'appartenance aux sonneries.** Les lire
  demanderait un `get()` sur l'emploi du temps à chaque écriture. Le calcul ignore de toute
  façon une heure hors liste.
- **Le seuil du mercredi est strictement avant 11:30**, et il s'applique à toute sortie
  effective, habituelle ou modifiée. Aucun emploi du temps importé ne finit avant 11:30 le
  mercredi : les enfants qui sortent à 11:30 restent sur le 13:15, rien ne change pour eux.
- **Modifier la sortie efface la permanence.** Garder une permanence à 17:00 après avoir
  avancé la sortie à 12:30 annulerait l'effet du changement. Le parent peut en reprendre une,
  car les offres repartent de la nouvelle sortie. Modifier seulement l'entrée garde la
  permanence.
- **Le 4ᵉ choix n'écrit rien tant qu'aucune heure n'est touchée.** Le panneau l'affiche
  coché (état local). Le premier tap sur une heure écrit `presence: 'present'` avec cette
  heure. Si on referme sans toucher d'heure, l'enfant reste comme avant. Le choix coché à la
  réouverture se déduit de `presence` et de la présence de `start`/`end`.

## Laissé au constructeur

- Noms exacts des fonctions et découpage des fichiers, dans le respect de l'Atomic Design
  déjà en place (`src/components/architecture.test.ts`).
- Texte exact du message d'effet, sur le modèle de la maquette.
- Rendu des boutons d'heure (taille, retour à la ligne) sur écran de téléphone.

## Suite prévue

**Sortie permanente le mercredi.** Un enfant qui ne déjeune pas au collège le mercredi sort à
12:30 et rentre avec des proches qui n'ont pas l'application. La règle du 13:15 ne le
concerne pas. Piste : une mention explicite dans le fichier d'import (« mercredi : retour
assuré par la famille »), plutôt qu'une déduction depuis `regime`. Elle sera cadrée dans un
chantier séparé, après celui-ci. Il suffit ici que le placement du retour du mercredi reste
une fonction isolée, facile à enrichir.
