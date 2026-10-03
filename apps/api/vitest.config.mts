import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
  },
  // SWC instead of esbuild: NestJS dependency injection needs decorator metadata.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
