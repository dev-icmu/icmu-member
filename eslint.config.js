import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|React' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXElement[openingElement.name.name="Input"] JSXAttribute[name.name="onChange"] MemberExpression[property.name="value"][object.property.name="target"]',
          message: '@beui/input onChange receives the string value directly, not an event object. Do not use e.target.value.'
        },
        {
          selector: 'JSXOpeningElement[name.name="Button"]:not(:has(JSXAttribute[name.name="type"]))',
          message: '@beui/button-base requires an explicit type prop (e.g. type="button" or type="submit").'
        }
      ]
    },
  },
  {
    files: ['src/components/motion/combobox/*.{js,jsx}'],
    rules: { 'react-hooks/refs': 'off' }
  },
  {
    files: ['src/router/*.jsx', 'src/context/*.jsx', 'src/components/motion/combobox/context.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' }
  }
])
