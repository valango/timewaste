module.exports = {
  root: true,

  parserOptions: {
    sourceType: 'module'
  },

  env: {
    es2020: true,
    node: true
  },

  extends: [
    'eslint:recommended'
  ],

  rules: {
    'no-multi-spaces': ['error', { ignoreEOLComments: true }],
    'no-multiple-empty-lines': 'warn',
    'no-trailing-spaces': 'warn',

    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unreachable': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
  }
}
