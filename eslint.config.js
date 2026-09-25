import js from '@eslint/js';
import storybook from 'eslint-plugin-storybook';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/', 'storybook-static/', 'coverage/', 'schemas/'] },
  js.configs.recommended,
  ...storybook.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        getComputedStyle: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Element: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDialogElement: 'readonly',
        MouseEvent: 'readonly',
      },
    },
  },
  prettier,
];
