import js from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import prettierRecommended from 'eslint-config-prettier';
import pluginImport from "eslint-plugin-import";

const compat = new FlatCompat();

const baseConfig = js.configs.recommended;

const nodeConfig = {
  files: ['main.js', 'electron/**/*.js', 'src/electron/**/*.js'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    globals: {
      ...globals.node,
      process: true,
    },
  },
  rules: {
    indent: [ "error", "tab" ],
    "no-undef": "error",
  }
};

const reactConfig = {
  files: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'],
  languageOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    globals: {
      ...globals.browser,
    },
  },
  plugins: {
    react: pluginReact,
  },
  ...pluginReact.configs.recommended,
  rules: {
    'react/react-in-jsx-scope': 'off',
    indent: [ "error", "tab" ],
    "no-undef": "error",
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};

const prettierConfig = {
  ...prettierRecommended,
  files: ['**/*.{js,jsx,ts,tsx}'],
};

const importRules = {
  plugins: {
    import: pluginImport,
  },
  rules: {
    "import/no-unresolved": "error", 
  }
};

export default [
  ...compat.extends('plugin:react-hooks/recommended'),
  baseConfig,
  nodeConfig,
  reactConfig,
  importRules,
  prettierConfig,
];
