// @source-path [fobles] tools/eslint/rules/const-files.ts

export const CONST_FILES = [
  "**/*.const.ts",
  "**/*.consts.ts",
  "**/*.constants.ts",
  "**/const.ts",
  "**/consts.ts",
  "**/constants.ts",
  "**/constants.*.ts",
];

const CONST_FILE_MESSAGE = "Only const declarations belong in .const.ts files.";

export const CONST_FILE_RESTRICTIONS = [
  { selector: "Program > :not(ImportDeclaration, VariableDeclaration[kind='const'], ExportNamedDeclaration)", message: CONST_FILE_MESSAGE },
  {
    selector: "Program > ExportNamedDeclaration > :not(VariableDeclaration[kind='const'], ExportSpecifier, Literal, ImportAttribute)",
    message: CONST_FILE_MESSAGE,
  },
  {
    selector: ":matches(ArrowFunctionExpression, FunctionExpression, ClassExpression, AwaitExpression)",
    message: "Constants in .const.ts files must be data only: no functions, classes or instances.",
  },
  {
    selector: "NewExpression:not([callee.type='Identifier'][callee.name=/^(Map|Set)$/])",
    message: "Constants in .const.ts files must be data only: no functions, classes or instances (new Map/new Set lookups are allowed).",
  },
  {
    selector: "CallExpression:not([callee.object.name='Math']):not([callee.object.name='Object'][callee.property.name='freeze'])",
    message: "Only Math.* and Object.freeze calls are allowed in .const.ts files.",
  },
];
