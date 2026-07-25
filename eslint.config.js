import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid/configs/typescript'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'vitest.config.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ...solid,
    languageOptions: {
      ...solid.languageOptions,
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
)
