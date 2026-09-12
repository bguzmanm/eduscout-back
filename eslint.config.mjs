import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import drizzle from 'eslint-plugin-drizzle';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      drizzle,
    },
    rules: {
      'drizzle/enforce-update-with-where': 'error',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'drizzle/**',
      'test/**',
    ],
  },
);