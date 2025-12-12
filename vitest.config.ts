import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['server/**/*.test.ts', 'client/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    environment: 'node',
    globals: true,
    pool: 'vmThreads',
    // Setup file handles unhandled rejection warnings from fake timer tests
    setupFiles: ['./vitest.setup.ts'],
  },
});
