// @source-path [fobles] tools/eslint/rules/type-files.ts

export const TYPE_DECLARATION_RESTRICTIONS = [
  { selector: "TSTypeAliasDeclaration:not([id.name=/Props$/])", message: "Type aliases must be declared in .types.ts files." },
  { selector: "TSInterfaceDeclaration", message: "Interfaces must be declared in .types.ts files." },
];

const TYPES_FILE_MESSAGE = "Only type aliases, interfaces and type imports/exports belong in .types.ts files.";

export const TYPES_FILE_RESTRICTIONS = [
  {
    selector: "Program > :not(ImportDeclaration, TSTypeAliasDeclaration, TSInterfaceDeclaration, ExportNamedDeclaration, ExportAllDeclaration[exportKind='type'], TSModuleDeclaration[declare=true])",
    message: TYPES_FILE_MESSAGE,
  },
  {
    selector: "Program > ExportNamedDeclaration > :not(TSTypeAliasDeclaration, TSInterfaceDeclaration, ExportSpecifier, Literal, ImportAttribute)",
    message: TYPES_FILE_MESSAGE,
  },
];
