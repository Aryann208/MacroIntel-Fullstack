import js from '@eslint/js';
import ts from 'typescript-eslint';
import next from 'eslint-config-next/core-web-vitals';
export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  ...next.map((config) => ({
    ...config,
    settings: { ...config.settings, next: { rootDir: 'apps/web/' } },
    files: ['apps/web/**/*.{ts,tsx,js,mjs}'],
  })),
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
];
