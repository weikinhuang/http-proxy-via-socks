/* eslint-env node */

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:node/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json', './tsconfig.eslint.json'],
  },
  globals: {
    process: false,
  },
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {},
    },
    {
      files: ['**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'node/no-missing-require': 'off',
        'node/no-unpublished-import': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
      },
    },
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false,
      },
    ],
    '@typescript-eslint/no-unused-vars': 'off',
    'dot-notation': 'error',
    eqeqeq: ['error', 'allow-null'],
    'no-console': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-implicit-coercion': [
      'error',
      {
        string: true,
        boolean: false,
        number: false,
      },
    ],
    'no-multi-str': 'error',
    'no-use-before-define': 'error',
    'no-with': 'error',
    'node/no-missing-import': [
      'error',
      {
        tryExtensions: ['.js', '.json', '.node', '.ts'],
      },
    ],
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': [
      'error',
      {
        ignores: ['modules'],
      },
    ],
    'object-shorthand': ['error', 'always'],
    'one-var': ['error', 'never'],
    'spaced-comment': ['error', 'always', { block: { balanced: true } }],
  },
};
