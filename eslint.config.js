import js from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import prettierRecommended from 'eslint-config-prettier';
import pluginImport from "eslint-plugin-import";
import pluginReactHooks from 'eslint-plugin-react-hooks';

const compat = new FlatCompat();

const reactRecommendedCompat = compat.extends('plugin:react/recommended');

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
      electronAPI: 'readonly',
    },
  },
  plugins: {
    react: pluginReact,
  },
  rules: {
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

const reactHooksConfig = {
  plugins: {
    'react-hooks': pluginReactHooks,
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};

const overrideReactPropTypes = {
	files: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'],
	rules: {
		'react/prop-types': 'off',
	},
};

export default [
  reactHooksConfig,
  baseConfig,
  nodeConfig,
  reactConfig,
  ...reactRecommendedCompat,
  importRules,
  prettierConfig,
  overrideReactPropTypes,
];
