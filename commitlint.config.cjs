/**
 * Ruta: /commitlint.config.cjs
 *
 * Propósito:
 * Definir las reglas obligatorias para validar los mensajes de commit.
 *
 * Responsabilidad única:
 * Validar que todos los commits sigan el estándar Conventional Commits.
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100]
  }
};
