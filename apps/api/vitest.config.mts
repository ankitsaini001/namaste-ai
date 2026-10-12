import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of esbuild: NestJS dependency injection needs decorator metadata.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'] },
      },
      {
        // Real MongoDB in a throwaway Docker container (Testcontainers).
        extends: true,
        test: {
          name: 'db',
          include: ['test/**/*.int-spec.ts'],
          globalSetup: ['test/support/global-setup.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
