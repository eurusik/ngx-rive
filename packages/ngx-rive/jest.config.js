/** @type {import('jest').Config} */
module.exports = {
  displayName: 'ngx-rive',
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleNameMapper: {
    '^@rive-app/canvas$': '<rootDir>/src/__mocks__/rive-canvas.mock.ts',
  },
  coverageDirectory: '../../coverage/packages/ngx-rive',
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
};
