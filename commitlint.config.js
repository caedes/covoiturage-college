/**
 * Commit messages feed Release Please: the type decides the next version. The types are those of
 * docs/rules/commits.md.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'ci', 'refactor', 'test', 'chore', 'style', 'perf', 'build'],
    ],
  },
}
