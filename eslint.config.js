import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";
import stylistic from "@stylistic/eslint-plugin";

const FOUNDATION_BOUNDARY_MESSAGE = "Foundation is infrastructure/domain code and must not import from features, shell, or shared UI. Move the dependency into foundation or invert the dependency.";
const SHARED_BOUNDARY_MESSAGE = "Shared code must not depend on a specialist feature. Move reusable behavior into shared/foundation or keep the dependency inside the feature.";
const FEATURE_BOUNDARY_MESSAGE = "Specialist features must not import another specialist feature. Move shared behavior into shared/foundation.";

export default defineConfig([
  {
    ignores: ["dist/**", "build/**", "build-ts/**", "node_modules/**", "playwright-report/**", "test-results/**", "test-artifacts/**"],
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    plugins: { "unused-imports": unusedImports, "@stylistic": stylistic },
    languageOptions: { globals: globals.browser, parserOptions: { project: "./tsconfig.eslint.json" } },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "@stylistic/max-statements-per-line": ["error", { max: 1 }],
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
    },
  },
  {
    files: ["src/content/foundation/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [
          { group: ["../../features/**", "../../../features/**", "../../../../features/**", "../../../../../features/**", "../../../../../../features/**"], message: FOUNDATION_BOUNDARY_MESSAGE },
          { group: ["../../shell/**", "../../../shell/**", "../../../../shell/**", "../../../../../shell/**", "../../../../../../shell/**"], message: FOUNDATION_BOUNDARY_MESSAGE },
          { group: ["../../shared/ui/**", "../../../shared/ui/**", "../../../../shared/ui/**", "../../../../../shared/ui/**", "../../../../../../shared/ui/**"], message: FOUNDATION_BOUNDARY_MESSAGE },
        ],
      }],
    },
  },
  {
    files: ["src/content/shared/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{ group: ["../../features/**", "../../../features/**", "../../../../features/**", "../../../../../features/**"], message: SHARED_BOUNDARY_MESSAGE }],
      }],
    },
  },
  {
    files: ["src/content/features/auditor/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{ group: ["../../reference-graph/**", "../reference-graph/**", "../../../features/reference-graph/**", "../../../../features/reference-graph/**"], message: FEATURE_BOUNDARY_MESSAGE }],
      }],
    },
  },
  {
    files: ["src/content/features/reference-graph/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{ group: ["../../auditor/**", "../auditor/**", "../../../features/auditor/**", "../../../../features/auditor/**"], message: FEATURE_BOUNDARY_MESSAGE }],
      }],
    },
  },
  {
    files: ["tests/e2e/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        paths: [{
          name: "@playwright/test",
          message: "Import foblesTest/expect from the local fixtures (e.g. \"../fixtures/playwright\") instead - importing from @playwright/test directly skips the fixture that loads the Fobles extension into the browser context.",
          allowTypeImports: true,
        }],
      }],
    },
  },
]);
