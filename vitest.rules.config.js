// Rules tests talk to the Firestore emulator; run them with `npm run test:rules`,
// which starts the emulator first.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.{js,ts}'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
