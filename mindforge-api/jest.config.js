/* global module, process */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.spec.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  // A referência oficial inclui SQL; a suíte rápida mantém relatório separado.
  coverageThreshold:
    process.env.MINDFORGE_SQL_TESTS === '1'
      ? { global: { lines: 80, statements: 80, functions: 80, branches: 80 } }
      : undefined,
  testEnvironment: 'node',
  // O NestJS 12 e o pg-boss são ESM puro: o Jest os carrega como módulos nativos
  // (npm test usa --experimental-vm-modules), sem passar pelo ts-jest.
  transformIgnorePatterns: ['/node_modules/'],
};
