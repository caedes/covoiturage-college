# Commits

Format **Conventional Commits**, description en français : `type: description`.

Le gitmoji est optionnel et suit le type quand il est présent — `feat: 🎸 …`,
`ci: 🎡 …` — tel que le produit l'outil `gc` (git-cz). Un agent qui ne peut pas passer
par un prompt interactif écrit le message à la main dans le même format.

- Types employés : `feat`, `fix`, `docs`, `ci`, `refactor`, `test`, `chore`.
- Description à l'impératif, en minuscule, sans point final.
- Pas de ligne `Co-Authored-By` : `includeCoAuthoredBy` est désactivé.

Un commit couvre un changement cohérent. Le hook `pre-commit` n'applique que Biome aux
fichiers stagés — il ne lance pas les tests. Lancer `npm test` avant de pousser.
