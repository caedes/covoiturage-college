# Confirmation avant « Annuler » et « Je le prends » — covoiturage-college

Date : 2026-11-17
Statut : validé (spec et rendu de la pop-in, sur maquette)

## Objet

Aujourd'hui, un seul tap sur « Annuler » ou « Je le prends » écrit tout de suite dans Firestore.
On annule un trajet trop facilement, par erreur. Ces deux actions passent désormais par une
pop-in de confirmation. « Je prends », sur un trajet libre, reste en un tap : il ne retire
rien à personne.

## Périmètre

- **Avec confirmation :** « Annuler », dans ses deux cas (un trajet que je conduis, et un
  trajet que je conduis où il n'y a plus personne à transporter), et « Je le prends » (je
  remplace le conducteur actuel).
- **Sans confirmation :** « Je prends », les présences, les trajets sautés, les permanences.
- **Hors sujet :** la logique d'écriture (`firebasePlanning`, `decideTake`, `decideCancel`)
  ne change pas.

## Approches

1. **`AlertDialog` de shadcn (Radix), retenue par le propriétaire.** Le paquet `radix-ui` est
   déjà une dépendance, utilisé par `DropdownMenu`. On ajoute le composant shadcn
   `alert-dialog` dans `src/components/atoms/ui/`. Focus piégé, Échap, fond assombri, retour du
   focus et rôles ARIA sont fournis, et le style est celui des autres composants shadcn.
2. **`<dialog>` natif avec `showModal()`.** Aucune bibliothèque, mais il faut écrire nous-mêmes
   le style, l'animation et la fermeture au clic sur le fond. Ce serait le seul composant fait
   main en dehors de shadcn, et les anciens Safari iOS ont des comportements irréguliers.
3. **`window.confirm()`, essayé en premier puis écarté.** On ne peut pas renommer ses boutons
   « Annuler » / « OK » : sous une question sur l'annulation d'un trajet, « Annuler » prend le
   sens inverse.

## Décisions

**Où se place la confirmation.** `act`, dans `src/components/pages/PlanningPage.tsx`, est le
seul point d'entrée des trois actions. Pour `cancel` et `takeOver`, le clic ouvre la pop-in au
lieu d'écrire. L'écriture n'a lieu qu'après « confirmer ». `take` écrit directement, comme
aujourd'hui.

**Une molécule `ConfirmDialog`** (`src/components/molecules/`). Elle reçoit un titre, une
description, les libellés des deux boutons et les rappels confirmer / renoncer. Elle ne connaît
rien des trajets. La page n'en monte qu'une et y place le trajet en attente de confirmation.

**Textes** (dans `src/lib/planningLabels.ts`, testés comme les autres libellés) :

| Action | Titre | Description | Renoncer | Confirmer |
|---|---|---|---|---|
| Annuler | Ne plus conduire ce trajet ? | Vous ne conduirez plus le trajet de 07:40, Maison → Centre-bourg. | Garder le trajet | Ne plus conduire |
| Je le prends | Prendre le trajet de Julie ? | Vous prendrez le trajet de 07:40, Maison → Centre-bourg à la place de Julie. | Retour | Prendre le trajet |

Le prénom est celui du conducteur affiché à l'écran (`trip.status` `covered`).

**Renoncer** (bouton, Échap) : la pop-in se ferme, rien n'est écrit, aucun message, et le focus
revient sur le bouton d'origine.

## Choix de l'agent, à vérifier

- **Bouton de confirmation de « Annuler » en variante `destructive`**, celui de « Je le prends »
  en variante par défaut. Une action qui retire un conducteur doit se voir.
- **Le focus s'ouvre sur le bouton « renoncer »** (comportement par défaut de Radix
  `AlertDialog`) : un second tap trop rapide ne confirme pas.
- **Pas de fermeture au clic sur le fond** : c'est le comportement de l'`AlertDialog`, qui
  oblige à choisir.
- **La pop-in se ferme dès la confirmation.** Le bouton du trajet passe alors en attente,
  comme aujourd'hui (`pendingKeys`). Un refus ou un conflit s'annonce par l'`ActionAlert`
  existante.
- **Focus après annulation d'un trajet vide.** Le trajet disparaît avec son bouton, et le code
  actuel envoie alors le focus au titre de la section. Radix rendrait le focus au bouton
  d'origine, qui n'existe plus : il faut garder le comportement actuel, par exemple avec
  `onCloseAutoFocus`.
- **Si le trajet change pendant que la pop-in est ouverte** (quelqu'un le prend entre-temps),
  la confirmation écrit avec le trajet tel qu'il était affiché : la transaction détecte déjà
  le conflit et l'annonce.

## Tests

- Libellés de la pop-in dans `planningLabels.test.ts`.
- `ConfirmDialog` : rendu, rappels confirmer et renoncer, Échap.
- `PlanningPage.driving.test.tsx` : « Annuler » et « Je le prends » n'écrivent qu'après
  confirmation, rien n'est écrit si on renonce, « Je prends » écrit sans pop-in. Les tests
  existants qui cliquent sur ces boutons passent par la confirmation.
- Vérification ensemble en local, sur les émulateurs (`npm run dev`), avant la PR.
