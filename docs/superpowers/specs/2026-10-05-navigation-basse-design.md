# Barre de navigation du bas — covoiturage-college

Date : 2026-10-05
Statut : validé en conversation, en relecture
Issue : [#12 Bottom Navigation Menu](https://github.com/caedes/covoiturage-college/issues/12)

## Objet

Remplacer l'en-tête et le pied de page par une barre de navigation fixée en bas de l'écran,
comme dans une application mobile. Elle porte deux boutons : « Aujourd'hui », qui remet le
planning sur le jour courant, et le compte, qui ouvre un menu pour se déconnecter. Le
récapitulatif de la semaine et sa barre de progression se fixent juste au-dessus. Le contenu
principal défile normalement entre le haut de l'écran et ces deux bandeaux.

Un POC jetable, essayé dans la vraie application, a fixé l'apparence. Les retours du
propriétaire sur ce POC sont intégrés plus bas.

## Ce qui disparaît

- Le lien « Accueil » et le bloc « Connecté en tant que … / Se déconnecter » de l'en-tête.
  L'en-tête (`header`), qui ne garderait plus que le lien d'évitement, disparaît aussi.
- Le pied de page « Projet personnel, licence GPL-3.0. ». La licence reste dans `LICENSE`.

## Décisions

**« Aujourd'hui » plutôt qu'« Accueil ».** Il n'y a qu'une page réelle, alors le libellé dit
ce que fait le bouton. L'icône est un calendrier (`CalendarCheck`, lucide), pas une maison.
Le lien n'a **pas d'état actif** : avec un `NavLink` vers `/`, il serait toujours marqué
« page courante », même quand on consulte un autre jour, ce qui serait trompeur. Les deux
boutons de la barre restent neutres. Le week-end, « Aujourd'hui » amène au lundi qui vient,
comme à l'ouverture de l'application (`initialDay`).

**La page réagit à la navigation vers `/`.** Le lien « Aujourd'hui » est un vrai lien vers
`/`. Suivre un lien, même vers l'adresse courante, change la clé de navigation de
`react-router` (`location.key`). `PlanningPage` observe cette clé, et à chaque changement
après le premier rendu elle remet l'onglet « Cette semaine », sélectionne
`initialDay(parisToday(now()))` et remonte en haut de la page. L'horloge est relue au clic,
donc le jour reste juste même si l'onglet est resté ouvert depuis la veille.

Approche écartée : porter le jour dans l'URL (`/?jour=…`). Le jour deviendrait partageable,
mais cela refond le routage, ce qui sort du périmètre de l'issue.

**Le template fixe le récapitulatif.** `PlanningTemplate` pose le récapitulatif dans un
bandeau fixe, juste au-dessus de la barre du bas. Une variable CSS unique,
`--bottom-nav-height`, donne la hauteur de la barre. La barre, le bandeau, la marge basse de
`main` et l'alerte d'échec s'appuient tous sur elle. Une autre page n'aurait simplement pas
de bandeau.

Approche écartée : un emplacement offert par le shell, que la page remplirait par un portail
ou un contexte. C'est plus générique, mais c'est un mécanisme de plus pour une seule page.

**Composants shadcn.** Le menu du compte utilise `dropdown-menu`, généré par
`npx shadcn@latest add dropdown-menu`. La CLI importe `cn` depuis un paquet npm homonyme et
l'ajoute à `package.json` : il faut retirer ce paquet et importer `cn` depuis
`@/lib/utils`, comme le signale AGENTS.md.

## Composants

L'arborescence suit l'Atomic Design : les nouveaux composants ne reçoivent que des props et
n'importent rien de `src/auth/` ni de `src/planning/`.

| Fichier | Niveau | Rôle |
| --- | --- | --- |
| `atoms/ui/dropdown-menu.tsx` | atome (shadcn) | Menu déroulant Radix, généré par la CLI |
| `molecules/AccountMenu.tsx` | molécule | Bouton du compte et son menu. Props : `firstName`, `onSignOut` |
| `organisms/BottomNav.tsx` | organisme | Barre fixe du bas. Props : `firstName: string \| null`, `onSignOut` |
| `routes/Layout.tsx` | shell | Lit l'authentification, compose le lien d'évitement, `BottomNav` et `main` |
| `templates/PlanningTemplate.tsx` | template | Titre « Covoiturage », bandeau fixe du récapitulatif |
| `pages/PlanningPage.tsx` | page | Retour au jour courant sur changement de `location.key`, titres « Covoiturage » |
| `organisms/WeeklyRecap.tsx` | organisme | Espacement resserré |
| `molecules/ActionAlert.tsx` | molécule | Remontée au-dessus de la barre du bas |

### `AccountMenu`

- **Déclencheur** : une pastille ronde (`size-6`, fond `primary`, texte `primary-foreground`,
  `font-heading`) qui porte l'initiale du prénom en majuscule. Sous la pastille, le prénom.
  Son nom accessible est « Compte de {prénom} », qui contient le texte visible (WCAG 2.5.3).
- **Menu**, ouvert vers le haut (`side="top"`, `align="end"`) :
  - le libellé « Connecté en tant que {prénom} », en `muted-foreground` ;
  - un séparateur ;
  - l'entrée « Se déconnecter », avec l'icône `LogOut`, qui appelle `onSignOut`.
- Le comportement clavier vient de Radix. Entrée, Espace et flèche bas ouvrent le menu, les
  flèches parcourent les entrées, Échap le ferme et rend le focus au déclencheur.

### `BottomNav`

- C'est le landmark `nav` « Navigation principale », fixé en bas (`fixed inset-x-0
  bottom-0`, `z-40`). Il est **blanc** (`bg-card`), alors que la page reste sur le gris du
  thème (`--background`). Un liseré le sépare du reste : `border-t border-foreground/15`,
  parce que `--border` est presque invisible sur le gris.
- Sa hauteur vaut `--bottom-nav-height`, plus la zone sûre du bas
  (`env(safe-area-inset-bottom)`). Son contenu est centré sur la largeur de l'application
  (`max-w-md`).
- Une liste de deux éléments, qui se partagent la largeur. Chaque élément montre l'icône au
  dessus d'un libellé court (`text-xs`, `muted-foreground`), et garde un focus visible :
  1. le `Link` « Aujourd'hui » vers `/`, avec l'icône `CalendarCheck`, sans `aria-current` ;
  2. l'`AccountMenu`, seulement quand `firstName` n'est pas `null`.

### `Layout`

- Ordre dans le DOM : lien d'évitement, puis `BottomNav`, puis `main`. La barre est fixe à
  l'écran mais **placée avant `main`** dans le DOM. L'ordre de tabulation reste donc le même
  qu'aujourd'hui : lien d'évitement, « Aujourd'hui », compte, puis le contenu. Le lien
  d'évitement garde son utilité.
- `main` reçoit la zone sûre du haut, plus un petit écart (`0.75rem`), et une marge basse
  égale à la barre, plus le bandeau du récapitulatif, plus la zone sûre du bas. Le dernier
  trajet du Retour reste ainsi visible quand on arrive en bas.
- Il reste dans `src/routes/` : il lit le contexte d'authentification, ce qu'un template ne
  fait pas.

### Récapitulatif fixé

- `PlanningTemplate` sort `recap` des onglets et le pose dans un bandeau fixe
  (`fixed inset-x-0`, `z-30`), dont le bas est à `--bottom-nav-height` plus la zone sûre du
  bas. Il est sur le fond gris de la page, centré sur `max-w-md`, avec une marge basse de
  `0.375rem` (`pb-1.5`).
- `WeeklyRecap` garde son trait fin en haut, qui le sépare du contenu qui défile dessous. Son
  espacement est resserré : `pt-2` au lieu de `pt-3`, `gap-1.5` au lieu de `gap-2`.

### Alerte d'échec

`ActionAlert` est aujourd'hui fixée à `bottom-4`, donc elle passerait sous la barre. Elle
remonte à `--bottom-nav-height`, plus la zone sûre du bas, plus `0.5rem`, et passe en
`z-50`. Elle recouvre le bandeau du récapitulatif pendant qu'elle est affichée, ce qui est
acceptable : elle disparaît après huit secondes ou avec « Fermer ».

### Titre et viewport

- Le `h1` devient « Covoiturage », sur le planning comme pendant le chargement et en cas
  d'erreur. L'onglet du navigateur garde « Covoiturage collège ». Le thème garde son nom,
  « Trajets collège ».
- `index.html` ajoute `viewport-fit=cover` à la balise viewport. Sans ce réglage, iOS ne
  fournit pas les zones sûres. Avec lui, le haut et le bas de la page doivent les respecter,
  d'où les marges de `main` et de la barre.

## Comportement

- **« Aujourd'hui » depuis le planning** : la page reste montée et réagit à la nouvelle clé
  de navigation. Elle repasse sur « Cette semaine » et le jour de `initialDay`, puis
  remonte en haut. Le focus reste sur le lien : un lecteur d'écran retrouve le jour
  sélectionné grâce à l'état déjà exposé par le sélecteur de jours.
- **« Aujourd'hui » depuis une adresse inconnue** : il ouvre le planning, qui démarre déjà
  sur le jour courant.
- **Écritures en cours** : « Je prends » et les options des enfants ne sont pas touchés.
  Seul l'affichage change de jour.
- **« Se déconnecter »** appelle `signOut`, comme le bouton actuel. `AuthGate` affiche
  ensuite l'écran de connexion.

## Accessibilité

- Landmarks restants : `navigation` (« Navigation principale ») et `main`. `banner` et
  `contentinfo` disparaissent avec l'en-tête vide et le pied de page.
- Le `h1` reste unique.
- La navigation au clavier est complète : lien d'évitement, barre du bas, menu du compte,
  puis contenu.
- La règle de contribution (`h1` unique, landmarks, navigation au clavier) reste respectée.

## Tests

### Vitest et Testing Library

Les noms de tests sont en français.

- **`AccountMenu.test.tsx`** (nouveau) :
  - la pastille montre l'initiale en majuscule ;
  - le nom accessible est « Compte de Karim » ;
  - le menu s'ouvre au clic et au clavier, et affiche « Connecté en tant que Karim » ;
  - « Se déconnecter » appelle `onSignOut` ;
  - Échap ferme le menu et rend le focus au déclencheur.
- **`BottomNav.test.tsx`** (nouveau) :
  - le landmark « Navigation principale » est présent ;
  - « Aujourd'hui » pointe vers `/`, sans `aria-current` ;
  - il n'y a pas de menu du compte quand `firstName` vaut `null`.
- **`Layout.test.tsx`** (mis à jour) :
  - les landmarks présents sont `navigation` et `main`, et il n'y a plus ni `banner`, ni
    `contentinfo`, ni mention de la licence ;
  - l'ordre de tabulation va du lien d'évitement à « Aujourd'hui », puis au compte ;
  - on se déconnecte par le menu ;
  - « Aujourd'hui » depuis une adresse inconnue ouvre le planning.
- **`PlanningPage.test.tsx`** (mis à jour) :
  - le titre est « Covoiturage » ;
  - après avoir choisi un autre jour et l'onglet « Semaine prochaine », « Aujourd'hui »
    ramène sur « Cette semaine » et le jour courant ;
  - un samedi, il ramène au lundi qui vient ;
  - si l'horloge a changé de jour depuis l'ouverture, il sélectionne le nouveau jour.
- **Mises à jour mécaniques** :
  - `routes.test.tsx` passe au nouveau titre ;
  - `AuthGate.test.tsx`, qui détectait le shell par le `banner`, passe à la `navigation`.
- **jsdom** : le menu Radix s'ouvre sur `pointerdown` et peut demander des compléments
  (`hasPointerCapture`, `scrollIntoView`). Ils s'ajoutent à `src/test/setupTests.ts`
  seulement si les tests l'exigent.

La position des bandeaux n'est pas testée sous jsdom, qui ne calcule pas de mise en page.
Elle est couverte par les TNR.

### TNR Playwright

Un fichier, `e2e/navigation-basse.spec.ts`, suit `docs/rules/tests-non-regression.md` :
écran de téléphone, base vide puis jeu fictif, date figée, connexion par `signInAs`,
sélecteurs accessibles. Il contient trois tests :

1. **« Aujourd'hui » ramène sur le jour courant** après un passage par un autre jour de la
   semaine prochaine.
2. **On se déconnecte par le menu du compte**, et l'écran de connexion revient.
3. **Le bas de page reste lisible** : défilé tout en bas, le dernier trajet du Retour est
   entièrement visible au-dessus du bandeau du récapitulatif et de la barre du bas. Le test
   compare leurs positions à l'écran (`boundingBox`).

Chaque test est d'abord vu en échec, en cassant le code qu'il protège, avant d'être commité.

## Documentation

AGENTS.md, section « UI » : la barre du bas (`BottomNav`), la variable
`--bottom-nav-height` sur laquelle s'alignent les éléments fixes, et le lien « Aujourd'hui »
qui remet le planning sur le jour courant par la clé de navigation.

## Livraison

- Branche `feat/navigation-basse`, puis une PR sous le compte du propriétaire du dépôt, dont
  la description porte `Closes #12` pour fermer l'issue à la fusion.
- Avant de pousser : `npm run lint`, `npm run build`, `npm test` et `npm run test:e2e`.
- Aucune règle Firestore n'est touchée, donc pas de `npm run rules:deploy`.

## Périmètre

Hors périmètre : un état du jour dans l'URL, d'autres entrées dans la barre, un mode sombre,
et la mise à jour de la page de connexion (`AuthTemplate`), qui n'a pas de barre du bas.

## Risques

- **Clé de navigation** : le retour au jour courant dépend de `location.key`. Si une version
  future de `react-router` ne la renouvelait plus pour un lien vers l'adresse courante, le
  bouton n'aurait plus d'effet. Le test de `PlanningPage` et le premier TNR le
  détecteraient.
- **Zones sûres** : elles ne se vérifient que sur un vrai iPhone. Les TNR tournent sous
  Chromium, où elles valent zéro. Un essai manuel sur téléphone reste nécessaire avant la
  fusion.
