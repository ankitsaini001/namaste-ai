import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/dist-worker/',
    '**/.next/',
    '**/coverage/',
    '**/next-env.d.ts',
    'docs/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: nextPlugin.configs.recommended.plugins,
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: { globals: globals.browser },
    settings: { next: { rootDir: 'apps/web' } },
  },
  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
);
