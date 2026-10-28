import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
    fileParallelism: false,
    // DB-lifecycle safety gate: rejects bare RUN_DB_TESTS=1 and any
    // marker/target/DATABASE_URL disagreement before suite imports. DB-free
    // runs (no RUN_DB_TESTS) are unaffected; see tests/e2e/vitest-db-safety.ts.
    setupFiles: ['./tests/e2e/vitest-db-safety.ts'],
  },
});
