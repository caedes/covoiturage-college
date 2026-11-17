# Commits

Format **Conventional Commits**, description en français : `type: description`.

Le gitmoji est optionnel et suit le type quand il est présent — `feat: 🎸 …`,
`ci: 🎡 …` — tel que le produit l'outil `gc` (git-cz). Un agent qui ne peut pas passer
par un prompt interactif écrit le message à la main dans le même format.

- Types admis : `feat`, `fix`, `docs`, `ci`, `refactor`, `test`, `chore`, `style`, `perf`,
  `build`.
- Description à l'impératif, en minuscule, sans point final.
- Pas de ligne `Co-Authored-By` : `includeCoAuthoredBy` est désactivé.

## Le type fait la version

Release Please calcule la prochaine version à partir des types : `feat` monte la mineure,
`fix` et `perf` le patch, une rupture la majeure. Les autres types ne changent pas la
version et n'apparaissent pas dans le changelog. Le numéro est montré aux parents : il ne
doit monter que quand l'application change pour eux.

- `feat` et `fix` sont réservés à ce qu'un parent peut voir ou subir.
- L'outillage, les tests et le CI passent en `chore`, `test`, `ci` ou `build`, même
  quand c'est une « fonctionnalité » pour le développeur (ex. le serveur de développement
  sur émulateurs : `chore`, pas `feat`).
- Une rupture se marque par `!` après le type (`feat!: …`) ou par un pied de message
  `BREAKING CHANGE: …`.
- Fusionner une PR ne livre rien. Livrer, c'est fusionner la PR de release que Release
  Please tient à jour.

commitlint refuse un message hors format : en local par le hook `commit-msg` (Husky), et
sur chaque PR, où tous les commits sont vérifiés (job CI `commits`).

## Contenu d'un commit

Un commit couvre un changement cohérent. Le hook `pre-commit` n'applique que Biome aux
fichiers stagés — il ne lance pas les tests. Lancer `npm test` avant de pousser.
