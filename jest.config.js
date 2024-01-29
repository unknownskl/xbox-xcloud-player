/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // preset: 'ts-jest',
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.[jt]s?(x)"']
};