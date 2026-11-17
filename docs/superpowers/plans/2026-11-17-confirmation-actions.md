# Confirmation avant « Annuler » et « Je le prends » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** « Annuler » et « Je le prends » ouvrent une pop-in de confirmation avant d'écrire dans Firestore. « Je prends » écrit toujours en un tap.

**Architecture :** On ajoute le composant shadcn `alert-dialog`, sans dépendance nouvelle puisque `radix-ui` est déjà installé. Une molécule `ConfirmDialog` l'habille et ne connaît rien des trajets. `PlanningPage` garde en état le trajet qui attend une confirmation. Elle n'appelle `act` (inchangé) qu'après « confirmer ». Les textes sont dans `planningLabels.ts`.

**Tech Stack :** React 19, shadcn (style `new-york`) sur `radix-ui` (`AlertDialog`), Tailwind, Vitest et Testing Library.

**Spec :** `docs/superpowers/specs/2026-11-17-confirmation-actions-design.md`

## Global Constraints

- Confirmation **uniquement** pour les actions `cancel` (statuts `mine` et `void`) et `takeOver`. `take` écrit sans pop-in.
- Textes, au mot près (exemple : 07:40, Maison → Centre-bourg, Julie) :
  - `cancel` : titre « Ne plus conduire ce trajet ? », description « Vous ne conduirez plus le trajet de 07:40, Maison → Centre-bourg. », renoncer « Garder le trajet », confirmer « Ne plus conduire ».
  - `takeOver` : titre « Prendre le trajet de Julie ? », description « Vous prendrez le trajet de 07:40, Maison → Centre-bourg à la place de Julie. », renoncer « Retour », confirmer « Prendre le trajet ».
- Le prénom vient de `trip.status.driverName` (statut `covered`).
- Bouton de confirmation en variante `destructive` pour `cancel`, variante par défaut pour `takeOver`.
- À l'ouverture, le focus est sur le bouton « renoncer ». Un clic sur le fond ne ferme pas la pop-in. Échap équivaut à renoncer.
- Renoncer : rien n'est écrit, aucun message, le focus revient sur le bouton du trajet.
- La pop-in se ferme dès la confirmation. L'état « en attente » du bouton (`pendingKeys`), les alertes et le message pour lecteurs d'écran restent ceux d'aujourd'hui.
- Après l'annulation d'un trajet vide (`void`), le focus va au titre de la section, comme aujourd'hui, et pas au bouton disparu.
- Pas de changement dans `src/planning/` ni dans `src/firebase/`.
- Atomic Design vérifié par `src/components/architecture.test.ts` : `ConfirmDialog` (molécule) n'importe que des atomes et `src/lib/`.
- Français pour ce qui se lit (interface vouvoyée, noms de tests, docs), anglais pour le code et les JSDoc (`docs/rules/langue.md`). Commits Conventional Commits en français, sans `Co-Authored-By` (`docs/rules/commits.md`).
- L'agent ne touche jamais la production (`docs/rules/production.md`) : la vérification se fait sur les émulateurs (`npm run dev`).
- Couverture ≥ 80 % (`npm run test:coverage`), `npm run lint` et `npm run check:bundle` au vert.

## Review Focus

- **Trajet modifié par quelqu'un d'autre pendant que la pop-in est ouverte.** Attendu : la confirmation écrit avec le trajet affiché au moment de l'ouverture. Le conflit est annoncé par l'alerte existante, sans plantage ni pop-in bloquée. Test : tâche 3, étape 1, « annonce le conflit quand le trajet a été pris pendant la confirmation ».
- **Double tap rapide sur « Annuler ».** Attendu : une seule pop-in. Le second tap tombe sur le fond, qui ne ferme rien. Couvert par le comportement modal de Radix. Vérifié à la main à la tâche 4.
- **Échap.** Attendu : comme « renoncer », rien n'est écrit. Test : tâche 2 (molécule) et tâche 3 (page).
- **Retour du focus après renoncement**, sur le bouton exact du trajet, même quand plusieurs trajets sont affichés. Test : tâche 3, étape 1.
- **Focus après annulation d'un trajet vide.** Le retour automatique du focus par Radix ne doit pas reprendre le focus au titre de section. Test existant « rend le focus à la section après l'annulation d'un trajet vidé », adapté à la tâche 3.

---

## Structure des fichiers

- Modifier `src/lib/planningLabels.ts` (+ test) : textes de la pop-in.
- Créer `src/components/atoms/ui/alert-dialog.tsx` : composant shadcn généré.
- Créer `src/components/molecules/ConfirmDialog.tsx` (+ test) : la pop-in de l'application.
- Modifier `src/components/pages/PlanningPage.tsx` : demander la confirmation avant `act`.
- Modifier `src/components/pages/PlanningPage.driving.test.tsx` : passer par la pop-in, tester les nouveaux cas.

---

### Task 1 : Textes de la pop-in

**Files:**
- Modify: `src/lib/planningLabels.ts`
- Test: `src/lib/planningLabels.test.ts`

**Interfaces:**
- Produces :
  ```ts
  export type ConfirmationText = { title: string; description: string; cancel: string; confirm: string }
  export function cancelConfirmation(time: string, label: string): ConfirmationText
  export function takeOverConfirmation(time: string, label: string, driverName: string): ConfirmationText
  ```

- [ ] **Step 1 : écrire les tests qui échouent**, dans un `describe('confirmations')` :

```ts
it("demande de confirmer l'annulation sans employer « Annuler »", () => {
  expect(cancelConfirmation('07:40', 'Maison → Centre-bourg')).toEqual({
    title: 'Ne plus conduire ce trajet ?',
    description: 'Vous ne conduirez plus le trajet de 07:40, Maison → Centre-bourg.',
    cancel: 'Garder le trajet',
    confirm: 'Ne plus conduire',
  })
})

it('nomme le conducteur remplacé', () => {
  expect(takeOverConfirmation('07:40', 'Maison → Centre-bourg', 'Julie')).toEqual({
    title: 'Prendre le trajet de Julie ?',
    description: 'Vous prendrez le trajet de 07:40, Maison → Centre-bourg à la place de Julie.',
    cancel: 'Retour',
    confirm: 'Prendre le trajet',
  })
})
```

- [ ] **Step 2 :** `npx vitest run src/lib/planningLabels.test.ts` → ÉCHEC (fonctions absentes).
- [ ] **Step 3 :** implémenter les deux fonctions et le type, avec un JSDoc court en anglais (« The question asked before … »).
- [ ] **Step 4 :** `npx vitest run src/lib/planningLabels.test.ts` → SUCCÈS.
- [ ] **Step 5 : commit** `feat: textes de confirmation avant annuler et je le prends`

---

### Task 2 : Composant `alert-dialog` et molécule `ConfirmDialog`

**Files:**
- Create: `src/components/atoms/ui/alert-dialog.tsx` (généré)
- Create: `src/components/molecules/ConfirmDialog.tsx`
- Test: `src/components/molecules/ConfirmDialog.test.tsx`

**Interfaces:**
- Consumes : `ConfirmationText` (tâche 1).
- Produces :
  ```ts
  type ConfirmDialogProps = {
    open: boolean
    text: ConfirmationText
    tone: 'default' | 'destructive'
    onConfirm: () => void
    onCancel: () => void
    /** Forwarded to Radix: lets the page send the focus elsewhere than the opening button. */
    onCloseAutoFocus?: (event: Event) => void
  }
  export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element
  ```

- [ ] **Step 1 : générer le composant shadcn.** `npx shadcn@latest add alert-dialog`. S'il propose d'écraser `button.tsx`, refuser : il est personnalisé. Vérifier que le fichier importe `AlertDialog` depuis `radix-ui` et qu'aucune dépendance n'a été ajoutée à `package.json` (`git diff package.json` vide). Puis `npm run format`.
- [ ] **Step 2 : écrire les tests qui échouent**, dans `ConfirmDialog.test.tsx` (même style que `ActionAlert.test.tsx`), avec le texte de `cancelConfirmation('07:40', 'Maison → Centre-bourg')` :
  - « affiche la question et ses deux réponses » : `getByRole('alertdialog', { name: 'Ne plus conduire ce trajet ?' })`, sa description accessible est la phrase, et les boutons « Garder le trajet » et « Ne plus conduire » existent.
  - « met le focus sur la réponse qui renonce » : `getByRole('button', { name: 'Garder le trajet' })` a le focus.
  - « confirme » : un clic sur « Ne plus conduire » appelle `onConfirm` une fois, et pas `onCancel`.
  - « renonce par le bouton ou par Échap » : un clic sur « Garder le trajet » appelle `onCancel`. Pareil avec `user.keyboard('{Escape}')` sur un nouveau rendu. `onConfirm` n'est jamais appelé.
  - « colore la confirmation selon le ton » : avec `tone: 'destructive'`, le bouton de confirmation a la classe `bg-destructive`. Avec `tone: 'default'`, il a `bg-primary`.
  - « ne rend rien fermée » : avec `open: false`, `queryByRole('alertdialog')` est `null`.
- [ ] **Step 3 :** `npx vitest run src/components/molecules/ConfirmDialog.test.tsx` → ÉCHEC.
- [ ] **Step 4 : implémenter `ConfirmDialog`.** C'est un `AlertDialog` contrôlé (`open`, et `onOpenChange(false)` → `onCancel`), sans `Trigger`. `AlertDialogCancel` porte `text.cancel` et `AlertDialogAction` porte `text.confirm`, avec `className={buttonVariants({ variant: tone })}`. Le pied de pop-in garde le rendu shadcn : boutons empilés sur mobile, confirmation en haut. `onCloseAutoFocus` est transmis à `AlertDialogContent`.
- [ ] **Step 5 :** relancer le test → SUCCÈS. `npx vitest run src/components/architecture.test.ts` → SUCCÈS.
- [ ] **Step 6 : commit** `feat: pop-in de confirmation ConfirmDialog sur l'alert-dialog shadcn`

---

### Task 3 : Demander la confirmation dans `PlanningPage`

**Files:**
- Modify: `src/components/pages/PlanningPage.tsx`
- Test: `src/components/pages/PlanningPage.driving.test.tsx`

**Interfaces:**
- Consumes : `ConfirmDialog` (tâche 2), `cancelConfirmation` et `takeOverConfirmation` (tâche 1), `act(trip)` existant.
- Produces : rien pour d'autres tâches. `TripSection` reçoit `onAction={request}` au lieu de `onAction={act}`.

- [ ] **Step 1 : adapter et écrire les tests.** Ajouter en haut du fichier un utilitaire :

```ts
async function answer(user: UserEvent, name: string) {
  const dialog = await screen.findByRole('alertdialog')
  await user.click(within(dialog).getByRole('button', { name }))
}
```

  Tests existants à adapter : après le clic sur le bouton du trajet, appeler `answer(user, 'Ne plus conduire')` dans « annule un trajet que je conduis » et « rend le focus à la section après l'annulation d'un trajet vidé ». Appeler `answer(user, 'Prendre le trajet')` dans « reprend le trajet d'un autre parent en le nommant » et « laisse le conducteur remplacé reprendre son trajet ». Leurs attentes ne changent pas. Les tests sur « Je prends » ne changent pas.

  Nouveaux tests :
  - « prend un trajet libre sans demander de confirmation » : après le clic sur `TAKE_ALLER`, `screen.queryByRole('alertdialog')` est `null` et `store.writes()` contient l'écriture `take`.
  - « demande confirmation avant d'annuler, sans rien écrire avant » : clic sur `Annuler — trajet de 07:40`. La pop-in « Ne plus conduire ce trajet ? » s'ouvre, et `store.writes()` vaut `[]`.
  - « n'annule rien quand on garde le trajet, et rend le focus au bouton » : `answer(user, 'Garder le trajet')`. Ensuite, `store.writes()` vaut `[]`, la pop-in a disparu, « Vous » est toujours affiché, et le bouton `Annuler — trajet de 07:40` a le focus (`waitFor`).
  - « ne reprend rien sur Échap » : sur « Je le prends », `user.keyboard('{Escape}')`. Ensuite, `store.writes()` vaut `[]` et le bouton `Je le prends — trajet de 07:40` a le focus.
  - « nomme le conducteur dans la confirmation de reprise » : avec `carpool(ALLER)` (conducteur Paul), la pop-in s'appelle « Prendre le trajet de Paul ? ».
  - « annonce le conflit quand le trajet a été pris pendant la confirmation » : avec `planning({ carpools: [carpool(ALLER)] }, { writeOutcome: { status: 'alreadyTaken', driverName: 'Maud' } })`, faire « Je le prends » puis `answer(user, 'Prendre le trajet')`. L'alerte affiche « Maud a pris ce trajet juste avant vous. » et la pop-in a disparu.
- [ ] **Step 2 :** `npx vitest run src/components/pages/PlanningPage.driving.test.tsx` → les tests adaptés et nouveaux ÉCHOUENT (aucune pop-in).
- [ ] **Step 3 : implémenter dans `PlanningPage`.**
  - État `const [asking, setAsking] = useState<PlannedTrip | null>(null)`.
  - `request(trip)` : `take` → `act(trip)`. `cancel`, ou `takeOver` avec un statut `covered` → `setAsking(trip)`. Ce même trajet (instantané pris au clic) est ensuite passé à `act`.
  - Un seul `<ConfirmDialog>` rendu à côté d'`ActionAlert`. `open={asking !== null}`. `text` vaut `cancelConfirmation(time, label)` ou `takeOverConfirmation(time, label, status.driverName)`. `tone` vaut `'destructive'` pour `cancel`. `onConfirm` : `setAsking(null)` puis `act(trip)`. `onCancel` : `setAsking(null)`. Garder le dernier texte affiché pendant l'animation de fermeture : mémoriser le trajet demandé dans une ref, ou ne pas vider le texte avant la fin. Sinon le contenu disparaît pendant le fondu.
  - `onCloseAutoFocus` : si le trajet confirmé est un `cancel` sur un statut `void`, `event.preventDefault()` et focus sur le titre de la section (`allerHeading` ou `retourHeading`). Sinon, laisser Radix rendre le focus au bouton. Le focus posé par `act` sur le titre après l'écriture reste en place.
  - Mettre à jour le JSDoc de `act` : il écrit sans demander, et c'est `request` qui confirme.
- [ ] **Step 4 :** `npx vitest run src/components/pages` → SUCCÈS. Puis `npm test` → SUCCÈS.
- [ ] **Step 5 : commit** `feat: confirmer avant annuler et je le prends`

---

### Task 4 : Vérifications et essai avec le propriétaire

**Files:** aucun, sauf correction.

- [ ] **Step 1 :** `npm run lint`, `npm run test:coverage` (≥ 80 %), `npm run build` et `npm run check:bundle` → tous au vert. Noter dans le compte rendu le poids ajouté au bundle.
- [ ] **Step 2 :** `npm run test:e2e` → SUCCÈS. Aucun parcours e2e ne clique aujourd'hui sur « Annuler » ou « Je le prends » : rien ne devrait changer.
- [ ] **Step 3 : essai avec le propriétaire.** Lancer `npm run dev` (émulateurs, jamais la prod), puis lui donner l'adresse. Il vérifie sur téléphone et sur ordinateur :
  - les deux pop-in, leurs textes et couleurs, conformes à la maquette validée ;
  - le double tap sur « Annuler » ;
  - Échap et « Garder le trajet » ;
  - « Je prends » toujours en un tap.
  Les retours sur le rendu se corrigent dans `ConfirmDialog` et donnent un commit `fix:` chacun.
