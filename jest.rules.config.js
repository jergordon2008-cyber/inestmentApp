// Firestore security-rules tests. They need the Firestore emulator, so they
// run through `npm run test:rules` (which starts one), not plain `npm test`.
module.exports = {
  testEnvironment: 'node',
  // Tests share one emulator and wipe it between tests: run files serially.
  maxWorkers: 1,
  testMatch: ['<rootDir>/tests/firestore-rules/**/*.test.ts'],
};
