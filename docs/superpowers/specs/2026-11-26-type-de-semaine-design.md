# Type de semaine dans les onglets

## Intention

L'emploi du temps affiché pour un enfant n'est peut-être pas celui de la bonne semaine
(A ou B) : ce n'est pas encore vérifié pour tous les enfants. Avant toute correction, on
affiche le type de semaine dans les onglets, pour que chaque famille compare d'un coup
d'œil avec l'emploi du temps papier : « Cette semaine (A) », « Semaine prochaine (B) ».

## Objectifs, non-objectifs

- Objectif : la lettre de la semaine, calculée par la règle existante, visible dans
  chacun des deux onglets.
- Non-objectif : changer la règle de parité ou sa référence (lundi 2026-09-21 = B). Les
  vacances scolaires durent toutes deux semaines : qu'elles comptent ou non dans
  l'alternance, la parité reste la même.
- Non-objectif : enquêter sur un horaire de sortie précis (fin à 17h signalée le
  2026-11-26), hors de ce lot.

## Approches

- **Props (retenue)** : `PlanningPage` calcule les deux lettres avec `weekType` et les
  passe à `WeekTabs`, comme il lui passe déjà `range`. `WeekTabs` reste un composant de
  présentation, sans état.
- Store ou hook dédié (état partagé, `useReducer`) : écartée. La lettre se déduit
  entièrement de la date du jour, que `PlanningPage` tient déjà ; un état de plus ne
  servirait qu'à se désynchroniser.

## Conception

- `PlanningPage` : `weekType(thisMonday)` et `weekType(nextMonday)`, transmis à
  `WeekTabs` en props (par exemple `currentWeekType`, `nextWeekType`).
- `WeekTabs` : libellés « Cette semaine (A) » et « Semaine prochaine (B) ». Les deux
  lettres sont visibles quel que soit l'onglet actif.
- Le week-end, « Cette semaine » bascule déjà sur la semaine qui arrive : les lettres
  suivent (samedi 2026-11-28 : « Cette semaine (B) », « Semaine prochaine (A) »).

## Tests

- Tests existants qui trouvent les onglets par leur nom : mis à jour avec la lettre.
- Un test à date fixe en semaine : jeudi 2026-11-26 donne « Cette semaine (A) » et
  « Semaine prochaine (B) ».
- Un test un jour de week-end : samedi 2026-11-28 donne « Cette semaine (B) » et
  « Semaine prochaine (A) ».

## Laissé au constructeur

Noms exacts des props, et niveau des tests (composant `WeekTabs` ou page entière), en
suivant les tests voisins.
