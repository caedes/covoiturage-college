# Compte GitHub

Toute commande `gh` s'exécute sous le compte **propriétaire du dépôt**, jamais sous le
compte actif du CLI.

Plusieurs comptes peuvent être authentifiés sur la machine, et le compte actif de `gh`
n'est pas forcément celui de ce dépôt. Sans précaution, une pull request ou une issue
part sous la mauvaise identité — visible publiquement, et pénible à défaire.

## Dériver le compte, ne jamais l'écrire en dur

Le compte se lit sur le remote. Aucun identifiant n'est donc écrit dans le dépôt, et la
règle reste valable telle quelle dans n'importe quel autre projet :

```bash
OWNER=$(git remote get-url origin | sed -E 's#.*[:/]([^/]+)/[^/]+$#\1#')
GH_TOKEN=$(gh auth token --user "$OWNER") gh pr create --fill
```

Le préfixe `GH_TOKEN=…` ne vaut que pour la commande qu'il précède. Il fonctionne avec
toutes les sous-commandes : `gh pr`, `gh issue`, `gh api`, `gh run`.

## Interdits

- **Ne jamais lancer `gh auth switch`.** Le changement est global et persistant : il
  affecte toutes les autres sessions de la machine, y compris celles d'un autre contexte.
- **Ne jamais retomber sur le compte actif.** Si `gh auth token --user "$OWNER"` échoue
  — compte non authentifié — s'arrêter et le signaler. Une commande non lancée coûte
  moins cher qu'une commande passée sous la mauvaise identité.
- **Ne jamais poser `user.name` ou `user.email` en configuration locale du dépôt.**
  L'identité git vient des règles `includeIf gitdir:` du `~/.gitconfig`, par dossier.
  La surcharger en local masquerait une mauvaise configuration au lieu de la corriger.

## Vérifier

```bash
GH_TOKEN=$(gh auth token --user "$OWNER") gh api user --jq .login   # doit afficher $OWNER
git config user.email                                              # identité du contexte
```
