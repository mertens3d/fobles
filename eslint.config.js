import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "build/**",
      "build-ts/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },

  {
    files: ["**/*.{ts,mts,cts}"],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],

    plugins: {
      "unused-imports": unusedImports,
    },

    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },

    rules: {
      "@typescript-eslint/no-floating-promises": "error",

      "@typescript-eslint/no-unused-vars": "off",

      "unused-imports/no-unused-imports": "error",
    },
  },
]);