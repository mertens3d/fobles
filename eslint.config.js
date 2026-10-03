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
      "test-artifacts/**",
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

  {
    // Importing foblesTest/expect straight from @playwright/test skips tests/fixtures/playwright.ts,
    // which is what actually launches the persistent browser context with the Fobles extension
    // loaded - a spec written this way runs against a plain browser with no extension at all,
    // silently, since Playwright itself has no way to know that was a mistake. Type-only imports
    // (e.g. `import type { Page } from "@playwright/test"`) are unaffected and still allowed.
    files: ["tests/e2e/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              message:
                "Import foblesTest/expect from the local fixtures (e.g. \"../fixtures/playwright\") instead - importing from @playwright/test directly skips the fixture that loads the Fobles extension into the browser context.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
]);