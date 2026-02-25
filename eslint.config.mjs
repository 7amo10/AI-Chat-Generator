// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'src/env.d.ts',
    ],
  },
  // TypeScript source files
  {
    files: ['src/**/*.{ts,tsx}', 'mcp/**/*.mjs', 'scripts/**/*.mjs'],
    plugins: { '@typescript-eslint': tseslint },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Enforce explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // No unused variables (but allow _ prefix)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // No any
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prefer const
      'prefer-const': 'error',
      // No var
      'no-var': 'error',
      // Consistent equality
      'eqeqeq': ['error', 'always'],
    },
  },
];
