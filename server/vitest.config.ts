import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    fileParallelism: false, // Run test suites sequentially to avoid SQLite write lock contention
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test_jwt_secret_key_for_vitest_runs',
    },
  },
});
