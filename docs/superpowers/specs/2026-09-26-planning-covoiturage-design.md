# Planning de covoiturage — covoiturage-college

Date : 2026-09-26
Statut : validé

## Objet

Construire la fonctionnalité métier de l'application : le planning partagé des trajets
domicile ↔ collège, repris du prototype réalisé avec Claude Design. Trois familles,
trois enfants, six parents. Chaque parent voit la semaine courante et la suivante, se
propose comme conducteur, et règle la présence et les options de ses propres enfants.

Cette spec est un **cadre** : elle fixe le vocabulaire, le modèle de données, les règles
de sécurité, le moteur de calcul, l'organisation de l'UI et le découpage en six lots.
Chaque lot fait l'objet de son propre plan d'implémentation.

## Confidentialité des exemples

Le dépôt est public. Tous les prénoms, adresses et horaires cités ici sont **fictifs** —
Alice, Basile et Chloé n'existent pas. Les données réelles ne vivent que dans
`data/import.json`, hors dépôt, et dans Firestore derrière les règles. Aucun document de
ce dépôt ne doit associer les vrais prénoms des enfants, leur commune et leurs horaires.

## État de l'existant

Le socle et l'authentification sont en place (specs du 2026-09-16 et du 2026-09-20) :
React 19, Vite, react-router en data router, Vitest et Testing Library, Biome, CI
GitHub Actions et déploiement Netlify. Firebase en plan **Spark** : pas de Cloud
Functions, toute garantie métier repose donc sur `firestore.rules`.

L'accès est réservé aux fiches `members/{email}`. Le domaine ne connaît que des ports
(`AuthPort`, `MemberRepository`) ; les adaptateurs Firebase vivent dans `src/firebase/`
et le SDK n'entre jamais dans le graphe d'imports des tests.

## Vocabulaire

Les termes sont ceux du prototype. Ils s'imposent aux libellés, aux noms de tests et aux
messages d'assertion.

| Terme | Sens |
| --- | --- |
| **Cette semaine** / **Semaine prochaine** | les deux seules semaines affichées |
| **Aller** / **Retour** | sens du trajet |
| **Maison → Centre-bourg** | aller : dépose au bus scolaire |
| **Centre-bourg → Maison** | retour : récupération à la descente du bus |
| **Collège → Maison** | retour : récupération en voiture au collège |
| **Bus scolaire** / **En voiture** | mode du trajet |
| **Présence** | état de l'enfant pour la journée |
| *Présent·e · covoiturage normal* | valeur par défaut |
| *Absent·e du collège* | l'enfant ne va pas au collège |
| *Au collège, mais sans covoiturage* | l'enfant y va par ses propres moyens |
| **Qui prend ce trajet ?** | retirer un enfant d'un seul trajet — affiche « Sans X sur ce trajet » |
| **Permanence HH:MM** | l'enfant reste au collège jusqu'à HH:MM pour rejoindre un trajet plus tardif |
| **Je prends** | se proposer sur un trajet libre |
| **Annuler** | se retirer d'un trajet qu'on conduit |
| **Je le prends** | reprendre un trajet déjà couvert par un autre parent |
| **Personne pour l'instant** | trajet sans conducteur |
| **Vous** | trajet que je conduis |
| **[Prénom]** | trajet conduit par un autre parent |
| **[Prénom] a pris votre place** | vu par le conducteur remplacé |
| **Personne à transporter** | trajet sans passager |
| **N trajets sur M couverts cette semaine / la semaine prochaine** | récapitulatif |

L'accord « absente / absent » dépend de l'enfant (`feminine`).

## Décisions

**Un outil de coordination, pas un moteur de règles.** L'emploi du temps donne une
proposition par défaut ; les parents composent ensuite l'organisation dans l'UI. Aucune
règle n'essaie de deviner qui conduit ni quand un enfant devrait rester en permanence.

**L'emploi du temps n'entre jamais dans le bundle ni dans le dépôt.** Netlify sert
`dist/` sans contrôle d'accès : la connexion Google ne protège que ce que l'application
affiche, pas ce que Netlify sert. Le JSON est importé par un script local dans
Firestore, seule barrière : les règles.

**Seules les actions humaines sont persistées.** Les trajets par défaut se calculent à la
volée à partir de la date, du type de semaine et de l'emploi du temps. Un document
n'existe que si quelqu'un a agi. Une semaine de vacances ne produit aucun enregistrement.

**Un document par covoiturage, un document par enfant et par jour.** Le conducteur
relève de n'importe quel parent ; la présence et les options d'un enfant relèvent de ses
seuls parents. Deux autorités, deux collections : les règles restent par document, sans
filtrage champ par champ.

**Les passagers ne sont pas stockés.** Ils sont recalculés depuis l'emploi du temps et
les options des enfants. Une seule source de vérité : activer une permanence déplace
l'enfant sans toucher aux covoiturages.

**Aucune adresse e-mail dans les données partagées.** Le socle garantit qu'aucun client
ne peut extraire les adresses des membres. Le conducteur est enregistré par `uid` et
prénom ; le lien parent → enfants vit dans la fiche `members` de chaque parent, que seul
son propriétaire lit.

**Emplois du temps versionnés.** Chaque import est une version datée (`validFrom`).
Un jour se calcule toujours avec la version en vigueur à cette date : réimporter en
janvier ne réécrit pas l'historique.

**Type de semaine par parité.** La semaine du lundi 2026-09-21 est une semaine **B** ;
l'alternance est supposée continuer sans interruption, vacances comprises. Une seule
constante dans le code. À revoir si le collège suspend l'alternance pendant les vacances.

**Vacances et jours fériés en constante.** Le calendrier de la zone A (académie de
Bordeaux) est une donnée publique : il vit dans le code, sans persistance, et se met à
jour une fois par an avec l'import.

**Verrouillage des jours passés côté serveur.** Un jour D n'est plus modifiable à partir
du lendemain 00:00 heure de Paris. Les règles ne connaissant que l'UTC, le verrou tombe à
**D 22:00 UTC** : minuit pile en heure d'été, 23:00 en heure d'hiver. Une heure de marge
l'hiver, jamais de trou. Le jour même reste modifiable, y compris pour un trajet dont
l'heure est passée.

**Pas de nettoyage automatique.** Sans Cloud Functions, un covoiturage dont tous les
passagers sont partis reste affiché, avec son conducteur, jusqu'à ce que celui-ci
l'annule. Personne n'est désinscrit sans le savoir.

## Trajets par défaut

Calculés pour chaque enfant et chaque jour de classe à partir de son emploi du temps.

| Jour | Sens | Trajet par défaut |
| --- | --- | --- |
| Lun → ven | Aller | `07:40 Maison → Centre-bourg · Bus scolaire`, quelle que soit l'heure d'entrée |
| Lun, mar, jeu, ven | Retour | heure de sortie égale à la `classEnd` d'un bus du soir → `Centre-bourg → Maison · Bus scolaire` à l'heure `arrival` de ce bus |
| Lun, mar, jeu, ven | Retour | sinon → `Collège → Maison · En voiture` à l'heure de sortie |
| Mer | Retour | `13:15 Collège → Maison · En voiture`, après le repas, quelle que soit l'heure de sortie |

Les enfants qui partagent le même jour, le même sens, le même lieu et la même heure
forment **un seul trajet**, donc un seul conducteur.

Les bus du soir sont une donnée d'import (`eveningBuses`). Valeurs provisoires, à
confirmer par le propriétaire du projet :

| Sortie des cours | Arrivée au Centre-bourg |
| --- | --- |
| 16:00 | 16:55 |
| 17:00 | 17:30 |

Le trajet collège ↔ Centre-bourg dure une demi-heure. Les jours sans bus relèvent d'une
organisation entre humains, hors application.

## Modèle Firestore

```
members/{email}                              écrit par le script d'import
  firstName: "Paul"   role: "parent"   childIds: ["basile"]
  firstName: "Basile" role: "child"    childId: "basile"

timetables/{validFrom}                       écrit par le script d'import
  validFrom: "2026-09-01"
  eveningBuses: [{ classEnd: "16:00", arrival: "16:55" }, …]
  children: {
    basile: {
      firstName: "Basile", feminine: false, colorSlot: 2,
      weeks: {
        A: { mon: { start: "08:25", end: "16:00" }, tue: …, wed: …, thu: …, fri: … },
        B: { … }
      }
    }, …
  }

carpools/{date}_{direction}_{place}_{HHmm}   écrit par les parents
  date: "2026-09-23"   direction: "retour"   place: "college"   time: "13:15"
  driverUid: "…"   driverName: "Paul"
  replacedDriverUid?: "…"
  updatedAt: <serverTimestamp>

childDays/{date}_{childId}                   écrit par les parents de l'enfant
  date: "2026-09-23"   childId: "basile"
  presence: "present" | "absent" | "sansCovoiturage"
  permanence?: "16:00"
  skipped: [] | ["aller"] | ["retour"] | ["aller", "retour"]
  updatedByUid: "…"
  updatedAt: <serverTimestamp>
```

- `direction` ∈ `aller` | `retour`, `place` ∈ `centre-bourg` | `college`. L'identifiant
  `2026-09-23_retour_college_1315` est déterministe : pas de requête pour retrouver un
  covoiturage, et deux clics simultanés visent le même document.
- `colorSlot` (1 à 3) relie l'enfant aux jetons du thème `child-1` à `child-3`.
- `permanence` est l'heure de sortie retenue pour le retour : l'enfant est placé comme si
  sa journée finissait à cette heure-là.
- Un `childDays` absent vaut `presence: "present"`, sans permanence ni retrait.

## Règles Firestore

Le socle reste inchangé pour `members` — lecture de sa propre fiche uniquement — et le
`match /{document=**}` final continue de fermer toute collection non déclarée.

Fonctions communes : `member()` lit `members/{request.auth.token.email.lower()}` ;
`isMember()` vérifie que l'utilisateur est vérifié et que la fiche existe ;
`isParent()` ajoute `role == 'parent'`.

| Collection | Opération | Condition |
| --- | --- | --- |
| `timetables` | lecture | `isMember()` |
| `timetables` | écriture | jamais (SDK Admin uniquement) |
| `carpools` | lecture | `isMember()` |
| `carpools` | création | `isParent()`, `driverUid == request.auth.uid`, `driverName == member().firstName`, pas de `replacedDriverUid` |
| `carpools` | mise à jour (« Je le prends ») | mêmes conditions, et `replacedDriverUid == resource.data.driverUid` |
| `carpools` | suppression (« Annuler ») | `resource.data.driverUid == request.auth.uid` |
| `childDays` | lecture | `isMember()` |
| `childDays` | création, mise à jour | `isParent()`, `childId in member().childIds`, `updatedByUid == request.auth.uid` |
| `childDays` | suppression | jamais |

Pour toute écriture sur `carpools` et `childDays` :

- **Forme** : l'identifiant du document correspond à ses champs ; `date` au format
  `AAAA-MM-JJ`, `time` et `permanence` au format `HH:MM` ; valeurs énumérées dans leurs
  listes fermées ; aucun champ hors liste (`keys().hasOnly(…)`) ; `updatedAt ==
  request.time`.
- **Verrou** : `request.time < jour(date) + 22 h`, `jour(date)` étant construit par
  `timestamp.date()` à partir des composantes de `date`.
- **Horizon** : `jour(date) <= request.time + 14 jours`, soit la fin de « Semaine
  prochaine ».
- **Comptes enfants** : aucun droit d'écriture, par construction de `isParent()`.

## Moteur de planning

Toute la logique métier vit dans `src/planning/`, en fonctions pures, sans React ni
Firebase.

```ts
buildWeek(input: {
  monday: IsoDate
  today: IsoDate
  timetables: Timetable[]
  carpools: Carpool[]
  childDays: ChildDay[]
  viewerUid: string
  holidays: HolidayCalendar
}): WeekPlan
```

`WeekPlan` porte cinq jours. Chaque jour indique s'il est `locked`, `holiday` ou
`covered`, et contient ses trajets **Aller** et **Retour**. Chaque trajet expose son
identifiant de covoiturage, son heure, son libellé, son mode, ses passagers, les enfants
retirés, les offres de permanence qui le visent et son statut.

Étapes, chacune exportée et testée isolément :

1. **`weekType(monday)`** — A ou B par parité depuis le 2026-09-21.
2. **`timetableFor(date, timetables)`** — la version de `validFrom` la plus récente
   inférieure ou égale à la date ; aucune version → jour sans trajet.
3. **`defaultLegs(child, date)`** — les trajets par défaut ci-dessus.
4. **`applyChildDay(legs, childDay)`** — *absent* et *sans covoiturage* retirent
   l'enfant des deux sens ; `skipped` le retire d'un sens ; `permanence` recalcule son
   retour avec l'heure retenue.
5. **`groupTrips(legs)`** — regroupement par (sens, lieu, heure) ; produit l'identifiant
   du covoiturage.
6. **`permanenceOffers(day)`** — pour un enfant présent, hors mercredi, chaque heure de
   retour plus tardive que la sienne parmi celles des autres enfants présents et les
   `classEnd` des bus du soir. L'offre s'affiche au-dessus du trajet que l'enfant
   rejoindrait.
7. **`resolveStatus(trip, carpool, viewerUid)`** — pas de passager → `void` ; pas de
   covoiturage → `open` ; conducteur = moi → `mine` ; sinon `covered`, avec l'indication
   « a pris votre place » quand `replacedDriverUid == viewerUid`.
8. **`weekRecap(week)`** — trajets couverts sur trajets à couvrir, hors `void` et hors
   jours de vacances.

**Semaine affichée.** « Cette semaine » est celle du lundi courant ; le samedi et le
dimanche, elle bascule sur la semaine qui arrive. Le jour sélectionné à l'ouverture est
aujourd'hui, ou le lundi le week-end.

**Dates.** Le domaine manipule des `IsoDate` (`"2026-09-23"`) et des heures `"HH:MM"`,
obtenues dans le fuseau `Europe/Paris` par `Intl.DateTimeFormat`. Pas d'objet `Date` dans
le domaine, pas de bibliothèque de dates.

**Calendrier.** `src/planning/holidays.ts` exporte les vacances de la zone A et les
jours fériés de l'année scolaire 2026-2027, recopiés depuis le calendrier officiel du
ministère au moment de l'implémentation. Un jour férié ou de vacances affiche
« Vacances scolaires » et sort du récapitulatif.

## Ports et adaptateurs

Même architecture que l'authentification : la page ne connaît qu'un port.

```ts
// src/planning/ports.ts
export type PlanningSnapshot = { timetables: Timetable[]; carpools: Carpool[]; childDays: ChildDay[] }

export type WriteOutcome =
  | { status: 'done' }
  | { status: 'alreadyTaken'; driverName: string }
  | { status: 'failed' }

export type PlanningRepository = {
  subscribe(
    range: { from: IsoDate; to: IsoDate },
    listener: (snapshot: PlanningSnapshot) => void,
    onError: () => void,
  ): () => void
  take(key: CarpoolKey): Promise<WriteOutcome>
  takeOver(key: CarpoolKey, currentDriverUid: string): Promise<WriteOutcome>
  cancel(key: CarpoolKey): Promise<WriteOutcome>
  saveChildDay(childDay: ChildDayDraft): Promise<WriteOutcome>
}
```

- `src/firebase/firebasePlanning.ts` implémente le port : `onSnapshot` sur `carpools` et
  `childDays` filtrés par dates, lecture de `timetables`, transaction pour `take` et
  `takeOver` (échec → `alreadyTaken` avec le prénom du conducteur en place).
- `Identity` gagne `uid`, nécessaire pour `driverUid`. `Member` gagne `childIds` (parent)
  ou `childId` (enfant) ; `toMember` reste tolérant et retombe sur une liste vide.
- `src/main.tsx` assemble l'adaptateur Firebase ; `src/test/` fournit un faux
  `PlanningRepository` en mémoire.

## UI

### Mise en place

- Tailwind v4 par `@tailwindcss/vite`, shadcn initialisé avec le thème
  `theme-trajets-college.css`, repris tel quel dans `src/index.css` à côté des styles
  existants (skip link, focus). Polices Barlow et Barlow Condensed depuis Google Fonts.
- Thème clair uniquement. Mobile d'abord, colonne centrée de 28rem au plus sur ordinateur.
- `components.json` range les composants shadcn dans `src/components/atoms/ui/`.

### Atomic Design

```
src/components/
├── atoms/       ui/ (Button, Badge, Tabs, ToggleGroup, RadioGroup, Card, Progress, Sonner)
│                ChildAvatar, StatusIcon, TripTime
├── molecules/   ChildChip, DayPill, WeekTabs, TripStatusBar, PresenceOption
├── organisms/   DaySelector, PresenceBar, PresencePanel, TripCard, PermanenceRow,
│                TripSection, WeeklyRecap
├── templates/   PlanningTemplate, AuthTemplate
└── pages/       PlanningPage
```

- Un niveau n'importe que les niveaux inférieurs.
- Atomes, molécules, organismes et templates ne reçoivent que des props.
- Seule `PlanningPage` consomme le port, via le hook `usePlanning`, et appelle
  `buildWeek`.
- `Layout` et les écrans d'authentification passent sur les atomes et `AuthTemplate`
  sans changer de comportement : leurs tests existants restent la référence.

### Écran Planning

Dans l'ordre du DOM : `h1` « Trajets collège » ; `WeekTabs` et la période
(« 21 – 25 septembre ») ; `DaySelector` ; `PresenceBar` et son panneau ; section
**Aller** ; section **Retour** avec les lignes `PermanenceRow` au-dessus des trajets
qu'elles visent ; `WeeklyRecap` fixé en bas.

`PlanningPage` remplace `Home` sur la route `/`. La navigation principale et son lien
« Accueil » restent en place.

### Droits d'affichage

| Élément | Parent de l'enfant | Autre parent | Compte enfant |
| --- | --- | --- | --- |
| Présence et son panneau | modifiable | affichage seul | affichage seul |
| « Qui prend ce trajet ? », Permanence | modifiable | affichage seul | affichage seul |
| Je prends, Annuler, Je le prends | oui | oui | masqué |

Jour passé : tout en affichage seul, mention « Journée passée ». Jour de vacances :
« Vacances scolaires », sans trajets.

### Accessibilité

- `WeekTabs` utilise le rôle `tablist`. `DaySelector` est un groupe de boutons en
  `aria-pressed` ; la pastille verte porte un texte masqué « tous les trajets sont
  couverts ».
- Une puce Présence ouvre son panneau (`aria-expanded`), qui est un `radiogroup`.
- Les puces enfant de « Qui prend ce trajet ? » et de Permanence sont des boutons bascule
  (`aria-pressed`).
- La couleur n'est jamais seule porteuse de sens : l'initiale est visible et le prénom
  forme le nom accessible.
- Les échecs d'écriture sont annoncés dans une toast `role="alert"`, sans déplacer le
  focus : « Paul a pris ce trajet juste avant vous », « Enregistrement impossible,
  vérifie ta connexion ».

### Réactivité

Les écritures simples (`childDays`, Annuler) profitent de la compensation de latence de
Firestore : `onSnapshot` renvoie l'état local sans attendre le serveur. « Je prends » et
« Je le prends » passent par une transaction : le bouton est désactivé, avec un état
« en cours », jusqu'à la réponse.

Une erreur d'abonnement affiche un message avec « Réessayer », sur le modèle de
`ErrorScreen`. Aucun écran ne reste vide.

## Script d'import

`npm run import -- data/import.json` exécute `scripts/import.ts` avec `tsx` et
`firebase-admin`. C'est le seul chemin d'écriture vers `members` et `timetables` ; il
remplace la création manuelle des fiches dans la console.

### Format d'entrée

Le format d'extraction des emplois du temps est conservé tel quel, complété de
`valableDu`, `busDuSoir`, `familles` et de trois champs par enfant (`feminin`,
`couleur`, `email` facultatif). Exemple fictif :

```json
{
  "valableDu": "2026-09-01",
  "busDuSoir": [
    { "sortie": "16:00", "arriveeCentreBourg": "16:55" },
    { "sortie": "17:00", "arriveeCentreBourg": "17:30" }
  ],
  "enfants": {
    "basile": {
      "prenom": "Basile",
      "feminin": false,
      "couleur": 2,
      "email": "basile@exemple.fr",
      "regime": "DPS",
      "autorisation_sortie": "En fonction des cours assurés",
      "horaires": {
        "semaine_A": {
          "lundi": { "debut": "08:25", "fin": "16:00" },
          "mardi": { "debut": "08:25", "fin": "17:00" },
          "mercredi": { "debut": "08:25", "fin": "12:30" },
          "jeudi": { "debut": "09:25", "fin": "17:00" },
          "vendredi": { "debut": "08:25", "fin": "14:55" }
        },
        "semaine_B": { "…": "mêmes cinq jours" }
      }
    }
  },
  "familles": [
    {
      "enfants": ["basile"],
      "parents": [
        { "email": "paul@exemple.fr", "prenom": "Paul" },
        { "email": "lea@exemple.fr", "prenom": "Léa" }
      ]
    }
  ]
}
```

`regime` et `autorisation_sortie` sont acceptés et ignorés : ils ne sont pas écrits.

### Garde-fous

- **Hors dépôt** : `data/*.json` est ignoré par Git, sauf `data/import.example.json`,
  fictif. La clé du compte de service est désignée par `GOOGLE_APPLICATION_CREDENTIALS`,
  rangée hors du dépôt, jamais en CI.
- **Validation Zod complète avant toute écriture** : heures `HH:MM`, cinq jours par
  semaine A et B, enfants des familles tous déclarés, chaque enfant rattaché à au moins
  une famille, e-mails passés en minuscules, `couleur` unique entre 1 et 3.
- **Simulation par défaut** : sans `--apply`, le script affiche les fiches créées,
  modifiées et supprimées, et la version d'emploi du temps, sans rien écrire.
- **Historique protégé** : refus de réécrire une version `timetables` dont `valableDu`
  est aujourd'hui ou avant.
- **Retrait explicite** : une fiche `members` absente du fichier n'est supprimée qu'avec
  `--prune` ; sinon elle est signalée et conservée.
- **Atomicité** : un seul `batch` Firestore.

Le schéma Zod et la traduction vers les documents Firestore sont des fonctions pures dans
`scripts/import/`, testées par Vitest. Seul `scripts/import.ts` touche `firebase-admin`.
Rien de ce dossier n'entre dans le bundle.

## Découpage en lots

| Lot | Contenu | Visible par les parents |
| --- | --- | --- |
| 1. Socle UI | Tailwind v4, shadcn, thème, polices, arborescence Atomic Design ; `Layout` et écrans d'authentification migrés | nouveau style, même comportement |
| 2. Données et import | script d'import, `childIds` / `childId`, `timetables`, règles de lecture, fichier d'exemple | rien |
| 3. Moteur de planning | `src/planning/` pur, calendrier, `buildWeek` | rien |
| 4. Planning en lecture | port, adaptateur Firebase, `PlanningPage`, organismes en affichage seul | le planning par défaut |
| 5. Conducteurs | Je prends, Annuler, Je le prends, transaction, règles `carpools` | on s'organise |
| 6. Options des enfants | Présence, « Qui prend ce trajet ? », Permanence, règles `childDays` | on ajuste par enfant |

Les lots 2 et 3 sont indépendants. Le lot 4 dépend des deux ; les lots 5 et 6 dépendent
du lot 4. Chaque lot a son plan d'implémentation, en commençant par le lot 1.

## Stratégie de test

### Niveau 1 — fonctions pures

`src/planning/` et `scripts/import/`, couverts de façon exhaustive : parité A/B,
changement de version d'emploi du temps, trajets par défaut (dont le mercredi et les
entrées à 09:25), regroupement, permanence, retrait d'un sens, absences, covoiturage
orphelin, statuts, « a pris votre place », récapitulatif, vacances, bascule du week-end,
validation et traduction du fichier d'import.

### Niveau 2 — vues

Via `renderRoute` et un faux `PlanningRepository` en mémoire. Chaque vue neuve a son test
de structure accessible (`h1` unique, landmarks, clavier), plus les droits d'affichage
selon le rôle : parent de l'enfant, autre parent, compte enfant. Les tests existants de
`Layout` et des écrans d'authentification restent verts après la migration du lot 1.

### Niveau 3 — règles Firestore

Contre l'émulateur, dans `tests/firestore.rules.test.ts`.

| Scénario | Attendu |
| --- | --- |
| Un membre lit `timetables`, `carpools`, `childDays` | autorisé |
| Un non-membre lit ces collections | refusé |
| Quiconque écrit dans `timetables` | refusé |
| Un parent prend un trajet libre à son nom | autorisé |
| Un parent prend un trajet au nom d'un autre (`driverUid` ou `driverName` faux) | refusé |
| Un parent reprend un trajet avec `replacedDriverUid` correct | autorisé |
| Un parent reprend un trajet avec `replacedDriverUid` faux | refusé |
| Le conducteur annule son trajet | autorisé |
| Un autre parent annule le trajet | refusé |
| Un parent modifie la présence de son enfant | autorisé |
| Un parent modifie la présence de l'enfant d'une autre famille | refusé |
| Un compte enfant écrit dans `carpools` ou `childDays` | refusé |
| Écriture sur un jour D avant D 22:00 UTC | autorisé |
| Écriture sur un jour D à partir de D 22:00 UTC | refusé |
| Écriture au-delà de 14 jours | refusé |
| Écriture avec un champ inconnu ou un identifiant incohérent | refusé |
| Énumération de `members` | refusé (inchangé) |

### Couverture

Seuil de 80 % inchangé. `scripts/import.ts` rejoint les exclusions, à côté de
`src/main.tsx` et `src/firebase/**` : il traduit un appel de fonction pure en appel SDK,
sans décision.

## Actions manuelles

1. Créer un compte de service Firebase avec le rôle d'écriture Firestore, télécharger
   sa clé hors du dépôt et pointer `GOOGLE_APPLICATION_CREDENTIALS` dessus.
2. Rédiger `data/import.json` à partir de `data/import.example.json`, avec les vrais
   emplois du temps, familles et adresses en minuscules.
3. Confirmer les horaires des bus du soir et les reporter dans `busDuSoir`.
4. Lancer l'import en simulation, relire, puis relancer avec `--apply`.
5. Déployer les règles après chaque lot qui les modifie : `npm run rules:deploy`,
   **avant** le déploiement de l'application qui en dépend.

## Hors périmètre

- Notifications : « a pris votre place » ne s'affiche que dans l'application.
- Écran dédié aux comptes enfants : le rôle et le lien existent, avec un accès en lecture
  seule à l'écran des parents.
- Changer le lieu d'un trajet (déposer au collège le matin, par exemple).
- Administration dans l'application, historique au-delà des deux semaines affichées.
- Mode sombre, manifeste PWA.
- Alternance A/B réelle après les vacances, jours sans bus, grèves.
