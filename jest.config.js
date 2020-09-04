// https://jestjs.io/docs/en/configuration
module.exports = {
  bail: 1,
  collectCoverage: true,
  collectCoverageFrom: ['**/*.js', '!*.config.js', '!.*'],
  coverageDirectory: 'reports',
  coveragePathIgnorePatterns: ['reports', 'test'],
  // coverageProvider: 'babel',
  verbose: true
}
