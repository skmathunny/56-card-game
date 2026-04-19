import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/decks/**/*.ts'],
      exclude: ['src/decks/images/**'],
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    // Map PNG asset requires to a lightweight stub so image-map modules
    // can be imported in the Node.js test environment.
    alias: [
      { find: /\.png$/, replacement: '' },
    ],
  },
});
