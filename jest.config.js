/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  testMatch: ['**/__tests__/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
