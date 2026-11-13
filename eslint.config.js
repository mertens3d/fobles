import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";
import stylistic from "@stylistic/eslint-plugin";

const FOUNDATION_BOUNDARY_MESSAGE =
  "Foundation is infrastructure/domain code and must not import from features, shell, or shared UI. Move the dependency into foundation or invert the dependency.";
const SHARED_BOUNDARY_MESSAGE =
  "Shared code must not depend on a specialist feature. Move reusable behavior into shared/foundation or keep the dependency inside the feature.";
const FEATURE_BOUNDARY_MESSAGE =
  "Specialist features must not import another specialist feature. Move shared behavior into shared/foundation.";

const TYPE_DECLARATION_RESTRICTIONS = [
  {
    selector: "TSTypeAliasDeclaration:not([id.name=/Props$/])",
    message: "Type aliases must be declared in .types.ts files.",
  },
  { selector: "TSInterfaceDeclaration", message: "Interfaces must be declared in .types.ts files." },
];

// Matches the Elbows "Consolidate Constants" source-file exclusions.
const CONST_FILES = [
  "**/*.const.ts",
  "**/*.consts.ts",
  "**/*.constants.ts",
  "**/const.ts",
  "**/consts.ts",
  "**/constants.ts",
  "**/constants.*.ts",
];

// Top-level exported consts whose value is not a function, class, call or other runtime logic.
const DATA_CONST_RESTRICTION = {
  selector:
    "Program > ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator" +
    ":not([init.type=/^(ArrowFunctionExpression|FunctionExpression|ClassExpression|CallExpression|NewExpression|AwaitExpression|ConditionalExpression)$/])",
  message: "Data-only constants must be declared in .const.ts files.",
};

const TYPES_FILE_MESSAGE = "Only type aliases, interfaces and type imports/exports belong in .types.ts files.";

const TYPES_FILE_RESTRICTIONS = [
  {
    selector:
      "Program > :not(ImportDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration, ExportNamedDeclaration, ExportAllDeclaration[exportKind='type'], TSModuleDeclaration[declare=true])",
    message: TYPES_FILE_MESSAGE,
  },
  {
    selector:
      "Program > ExportNamedDeclaration > :not(TSTypeAliasDeclaration, TSInterfaceDeclaration, ExportSpecifier, Literal, ImportAttribute)",
    message: TYPES_FILE_MESSAGE,
  },
];

const CONST_FILE_MESSAGE = "Only const declarations belong in .const.ts files.";

const CONST_FILE_RESTRICTIONS = [
  {
    selector: "Program > :not(ImportDeclaration, VariableDeclaration[kind='const'], ExportNamedDeclaration)",
    message: CONST_FILE_MESSAGE,
  },
  {
    selector:
      "Program > ExportNamedDeclaration > :not(VariableDeclaration[kind='const'], ExportSpecifier, Literal, ImportAttribute)",
    message: CONST_FILE_MESSAGE,
  },
  {
    selector:
      ":matches(ArrowFunctionExpression, FunctionExpression, ClassExpression, NewExpression, AwaitExpression)",
    message: "Constants in .const.ts files must be data only: no functions, classes or instances.",
  },
  {
    selector:
      "CallExpression:not([callee.object.name='Math']):not([callee.object.name='Object'][callee.property.name='freeze'])",
    message: "Only Math.* and Object.freeze calls are allowed in .const.ts files.",
  },
];

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
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    plugins: { "unused-imports": unusedImports, "@stylistic": stylistic },
    languageOptions: { globals: globals.browser, parserOptions: { project: "./tsconfig.eslint.json" } },
    rules: {
      curly: ["error", "all"],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "@stylistic/max-statements-per-line": ["error", { max: 1 }],
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0, maxBOF: 0 }],
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["type", "export"] },
      ],
    },
  },
  {
    files: ["src/content/foundation/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../features/**",
                "../../../features/**",
                "../../../../features/**",
                "../../../../../features/**",
                "../../../../../../features/**",
              ],
              message: FOUNDATION_BOUNDARY_MESSAGE,
            },
            {
              group: [
                "../../shell/**",
                "../../../shell/**",
                "../../../../shell/**",
                "../../../../../shell/**",
                "../../../../../../shell/**",
              ],
              message: FOUNDATION_BOUNDARY_MESSAGE,
            },
            {
              group: [
                "../../shared/ui/**",
                "../../../shared/ui/**",
                "../../../../shared/ui/**",
                "../../../../../shared/ui/**",
                "../../../../../../shared/ui/**",
              ],
              message: FOUNDATION_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/content/shared/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../features/**",
                "../../../features/**",
                "../../../../features/**",
                "../../../../../features/**",
              ],
              message: SHARED_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/content/features/auditor/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../reference-graph/**",
                "../reference-graph/**",
                "../../../features/reference-graph/**",
                "../../../../features/reference-graph/**",
              ],
              message: FEATURE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/content/features/reference-graph/**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../auditor/**",
                "../auditor/**",
                "../../../features/auditor/**",
                "../../../../features/auditor/**",
              ],
              message: FEATURE_BOUNDARY_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/e2e/**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              message:
                'Import foblesTest/expect from the local fixtures (e.g. "../fixtures/playwright") instead - importing from @playwright/test directly skips the fixture that loads the Fobles extension into the browser context.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.types.ts", "**/*.d.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...TYPE_DECLARATION_RESTRICTIONS],
    },
  },
  {
    // ESLint replaces (does not merge) no-restricted-syntax per block, so each block below
    // repeats every restriction that must still apply to its files.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.types.ts", "**/*.d.ts", ...CONST_FILES],
    rules: {
      "no-restricted-syntax": ["error", ...TYPE_DECLARATION_RESTRICTIONS, DATA_CONST_RESTRICTION],
    },
  },
  {
    files: CONST_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...TYPE_DECLARATION_RESTRICTIONS, ...CONST_FILE_RESTRICTIONS],
    },
  },
  {
    files: ["**/*.types.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...TYPES_FILE_RESTRICTIONS],
    },
  },
]);