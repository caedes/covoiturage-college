# Développer sans toucher la production — design

## Pourquoi

Des parents se servent de l'application pour de vrai. Le développement local, celui du
propriétaire comme celui des agents de code, ne doit plus jamais lire ni écrire les
données du projet Firebase de production (`covoiturage-college-915d5`). Aujourd'hui,
`.env.local` pointe sur ce projet : `npm run dev` y écrit.

## Objectifs

- `npm run dev` tourne sur les émulateurs Auth et Firestore, projet `demo-covoiturage`,
  avec des familles fictives déjà importées.
- Une application de développement ne peut pas démarrer sur un projet réel.
- Un agent de code est empêché, par la configuration et pas seulement par une consigne,
  d'atteindre la production (outils Firebase connectés, déploiement des règles, clé du
  compte de service).

## Non-objectifs

- Pas d'environnement en ligne hors production (pas de projet Firebase de recette, pas de
  déploiement de prévisualisation Netlify). Besoin limité au poste local.
- Pas de copie des données de production vers les émulateurs.

## Anti-objectifs

- Une option « dev sur la prod » qu'on lance par réflexe : elle n'existe pas.
- Retirer au propriétaire l'import réel ou `npm run rules:deploy` : les blocages visent
  l'agent, pas lui.

## Approches envisagées

- **A. Émulateurs par défaut, sans retour possible sur la prod en local** — retenue par le
  propriétaire. La protection vient de l'outillage, pas de la discipline.
- **B. Émulateurs en option (`dev:local`), `dev` reste sur la prod** — écartée : une
  commande lancée par réflexe suffit à écrire chez les parents.
- **Second projet Firebase de recette** — écarté : utile seulement pour une version en
  ligne, que le propriétaire ne veut pas.

## Conception

1. **Le mode `development` passe sur les émulateurs.** Un fichier `.env.development`,
   versionné comme `.env.e2e`, porte la configuration du projet `demo-covoiturage`.
   `src/firebase/app.ts` se branche sur les émulateurs en mode `development` (serveur de
   développement) ou `e2e` (build des TNR). La condition reste une constante de build, donc
   absente du bundle de production (`npm run check:bundle` le vérifie toujours). Pas de
   nouveau mode : `vite` lance `development` par défaut.
2. **`npm run dev`** lance `firebase-tools emulators:exec --project demo-covoiturage --only
   auth,firestore`, importe un fichier de données par `scripts/import.ts` (émulateur forcé,
   clé de compte de service retirée de l'environnement, sortie vérifiée comme dans
   `e2e/support/emulators.ts`), puis démarre `vite`. Par défaut le fichier est
   `data/import.example.json` ; `npm run dev -- data/import.json` en charge un autre, pour
   vérifier à l'écran un changement d'horaires avant de l'importer en production. Vite
   tourne en http et sans relais `/__/auth` en mode `development` : c'est l'émulateur qui
   sert la page de connexion Google, où l'on saisit l'e-mail d'un parent
   (`camille@exemple.fr`…).
3. **Garde au démarrage.** Hors build de production (`import.meta.env.PROD`), un projet dont
   l'identifiant ne commence pas par `demo-` fait échouer le démarrage avec un message
   clair. Un projet `demo-*` ne peut joindre que des émulateurs.
4. **`.env.local` de production supprimé.** Vite charge `.env.local` dans tous les modes et
   il l'emporte sur `.env.development` : le garder ramènerait la prod. Le build de
   production prend sa configuration des Variables GitHub en CI ; il n'en a pas besoin sur
   le poste. Si un `.env.local` ou `.env.development.local` réapparaît avec un projet réel,
   la garde du point 3 bloque le démarrage.
5. **Blocages pour l'agent.** Un `.claude/settings.json` versionné refuse : les outils du
   serveur MCP Firebase (`mcp__plugin_firebase_firebase__*`), `npm run rules:deploy` et tout
   `firebase-tools … deploy`, toute commande qui mentionne `GOOGLE_APPLICATION_CREDENTIALS`,
   et la lecture des fichiers de clé (`*firebase-adminsdk*.json`, `*service-account*.json`).
   Ces règles reposent sur des motifs : elles ferment les accès connus, pas tout accès
   imaginable. La règle écrite les complète.
6. **Règle écrite.** `docs/rules/production.md`, importée par `AGENTS.md` : l'agent ne
   touche jamais la production, et explique pourquoi. `AGENTS.md` et le README décrivent le
   nouveau `npm run dev`.

## Choix laissés au constructeur (décidés par Claude, à corriger si besoin)

- Données remises à zéro à chaque lancement (pas d'`--export-on-exit`) : un état connu et
  reproductible vaut mieux qu'un historique local.
- Jeu importé par défaut : `data/import.example.json`, l'exemple documenté, plutôt que la
  fixture des TNR qui évolue avec les tests.
- Tests : la garde de démarrage et le choix des émulateurs par mode sont couverts par des
  tests unitaires ; le relais `/__/auth` désactivé en mode `development` s'ajoute aux tests
  de `firebaseAuthProxy`.

## Changements d'horaires réels

Préparés ensemble en local : l'agent modifie `data/import.json` (hors Git), on le charge
par `npm run dev -- data/import.json` et on vérifie le planning. Mis en production par le
propriétaire seul : `npm run import -- data/import.json` (simulation), puis `--apply`.
L'agent n'a pas la clé et ne voit pas la simulation contre la prod, sauf si le
propriétaire la lui colle.
