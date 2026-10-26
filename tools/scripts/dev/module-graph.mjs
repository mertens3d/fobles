// @source-path [fobles] tools/scripts/dev/module-graph.mjs
import fs from "node:fs/promises";
import path from "node:path";

export const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

const RESOLUTION_SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".d.ts"];
const STRIP_SUFFIXES = [".d.ts", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const EXCLUDED_DIRECTORY_NAMES = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", "test-results", "playwright-report", "test-artifacts", "artifacts"]);
const MOCK_CALLEES = new Set(["vi.mock", "vi.doMock", "vi.importActual", "vi.importMock", "jest.mock", "jest.doMock", "jest.requireActual"]);

export function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

// Case-insensitive on purpose: Windows resolves imports regardless of case, so the map must too.
export function pathKey(value) {
  return normalizeSlashes(path.resolve(value)).toLowerCase();
}

export function toRepoRelative(root, absolutePath) {
  return normalizeSlashes(path.relative(root, absolutePath));
}

export async function enumerateFiles(root, { excludeDirectories = [] } = {}) {
  const excludedKeys = new Set(excludeDirectories.map((directory) => pathKey(directory)));
  const results = [];

  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name) && !excludedKeys.has(pathKey(entryPath))) await visit(entryPath);
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }

  await visit(root);

  return results;
}

export function buildFileMap(paths) {
  const map = new Map();

  paths.forEach((filePath) => map.set(pathKey(filePath), filePath));

  return map;
}

// Resolves a relative specifier against a set of known files (never the real file system), so the same function can
// check the repository as it is now and as it will be after a migration.
export function resolveInMap(importerPath, specifier, fileMap) {
  const base = path.resolve(path.dirname(importerPath), specifier);
  const candidates = [
    base,
    ...RESOLUTION_SUFFIXES.map((suffix) => base + suffix),
    ...RESOLUTION_SUFFIXES.map((suffix) => path.join(base, `index${suffix}`)),
  ];
  const matches = [];

  candidates.forEach((candidate) => {
    const hit = fileMap.get(pathKey(candidate));

    if (hit && !matches.includes(hit)) matches.push(hit);
  });

  let result = { status: "unresolved" };

  if (matches.length === 1) {
    result = { status: "resolved", path: matches[0] };
  } else if (matches.length > 1) {
    const exact = fileMap.get(pathKey(base));

    result = exact ? { status: "resolved", path: exact } : { status: "ambiguous", matches };
  }

  return result;
}

export function parseSource(ts, filePath, content) {
  const extension = path.extname(filePath);
  const scriptKind = extension === ".tsx"
    ? ts.ScriptKind.TSX
    : extension === ".jsx"
      ? ts.ScriptKind.JSX
      : [".js", ".mjs", ".cjs"].includes(extension)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
}

// Every place a module specifier appears: import/export declarations, import-equals, import("..."), require("..."), import
// types, and the test-runner mock calls that take a module path. `start`/`end` cover the text between the quotes.
export function collectModuleSpecifiers(ts, sourceFile) {
  const results = [];

  function add(literal, kind, declaration) {
    if (literal && ts.isStringLiteralLike(literal)) {
      results.push({ kind, start: literal.getStart(sourceFile) + 1, end: literal.getEnd() - 1, value: literal.text, declaration });
    }
  }

  function calleeName(expression) {
    return ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)
      ? `${expression.expression.text}.${expression.name.text}`
      : undefined;
  }

  function visit(node) {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier, "import", node);
    else if (ts.isExportDeclaration(node)) add(node.moduleSpecifier, "export", node);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression, "import-equals", node);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal, "import-type", node);
    else if (ts.isCallExpression(node) && node.arguments.length >= 1) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], "dynamic", node);
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") add(node.arguments[0], "require", node);
      else if (MOCK_CALLEES.has(calleeName(node.expression))) add(node.arguments[0], "mock", node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return results;
}

// Names a module exports at its top level: declarations with an `export` modifier, and `export { a, b }` lists.
export function collectExportedNames(ts, sourceFile) {
  const names = new Set();
  const isExported = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;

  sourceFile.statements.forEach((statement) => {
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      statement.declarationList.declarations.forEach((declaration) => {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      });
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement))
      && statement.name && isExported(statement)
    ) {
      names.add(statement.name.text);
    } else if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      statement.exportClause.elements.forEach((element) => names.add(element.name.text));
    }
  });

  return names;
}

// The specifier an importer at `importerPath` must use to reach `targetPath`. An extensionless original stays
// extensionless; an original that spelled out an extension keeps it.
export function buildRelativeSpecifier(importerPath, targetPath, originalSpecifier) {
  let relative = normalizeSlashes(path.relative(path.dirname(importerPath), targetPath));

  if (!relative.startsWith(".")) relative = `./${relative}`;

  if (!SOURCE_EXTENSIONS.has(path.extname(originalSpecifier))) {
    const suffix = STRIP_SUFFIXES.find((candidate) => relative.endsWith(candidate));

    if (suffix) relative = relative.slice(0, -suffix.length);
    if (relative.endsWith("/index") && !originalSpecifier.endsWith("/index")) relative = relative.slice(0, -"/index".length);
  }

  return relative;
}
