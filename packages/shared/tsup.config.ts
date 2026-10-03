import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    // tsup's declaration build sets `baseUrl` internally, which TypeScript 6 deprecates.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: true,
  // Never empty dist/ in watch mode: the apps would briefly lose the type declarations.
  clean: !options.watch,
  target: 'es2023',
}));
