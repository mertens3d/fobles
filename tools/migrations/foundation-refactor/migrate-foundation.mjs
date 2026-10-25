import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const requireFromRepository = createRequire(path.join(repositoryRoot, "package.json"));
const ts = requireFromRepository("typescript");
const applyChanges = process.argv.includes("--apply");
const moveMapPath = path.join(scriptDirectory, "move-map.json");
const reportPath = path.join(scriptDirectory, "foundation-migration-report.json");
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const resolutionSuffixes = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".d.ts"];
const indexSuffixes = resolutionSuffixes.map((extension) => path.join("index" + extension));

function normalize(value) {
  return path.resolve(value);
}

function normalizeSlashes(value) {
  return value.replaceAll(path.sep, "/");
}

function isWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function mapPath(absolutePath, moves) {
  const matchingMove = moves
    .filter((move) => isWithin(absolutePath, move.from))
    .sort((left, right) => right.from.length - left.from.length)[0];
  return matchingMove ? path.join(matchingMove.to, path.relative(matchingMove.from, absolutePath)) : absolutePath;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function enumerateFiles(root) {
  const results = [];
  const visit = async (directory) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (["node_modules", ".git", "build", "dist", "coverage", ".next"].includes(entry.name)) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else results.push(entryPath);
    }
  };
  await visit(root);
  return results;
}

async function resolveRelativeSpecifier(importerPath, specifier, redirects) {
  const base = path.resolve(path.dirname(importerPath), specifier);
  const redirectedTarget = redirects.get(base);
  if (redirectedTarget) {
    if (!(await exists(redirectedTarget))) {
      throw new Error(`Configured redirect target does not exist: ${normalizeSlashes(path.relative(repositoryRoot, redirectedTarget))}`);
    }
    return redirectedTarget;
  }
  const candidates = [base, ...resolutionSuffixes.map((suffix) => base + suffix), ...indexSuffixes.map((suffix) => path.join(base, suffix))];
  const matches = [];
  for (const candidate of candidates) if (await exists(candidate)) matches.push(candidate);
  if (matches.length === 0) return undefined;
  if (matches.length > 1) {
    const exactFile = matches.find((candidate) => candidate === base);
    if (exactFile) return exactFile;
    throw new Error(`Ambiguous relative import '${specifier}' from '${normalizeSlashes(path.relative(repositoryRoot, importerPath))}': ${matches.map((match) => normalizeSlashes(path.relative(repositoryRoot, match))).join(", ")}`);
  }
  return matches[0];
}

function collectModuleSpecifiers(sourceFile) {
  const results = [];
  const add = (literal) => {
    if (literal && ts.isStringLiteralLike(literal)) results.push({ start: literal.getStart(sourceFile) + 1, end: literal.getEnd() - 1, value: literal.text });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
    else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0]);
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return results;
}

function buildRelativeSpecifier(importerPath, targetPath, originalSpecifier) {
  let relative = normalizeSlashes(path.relative(path.dirname(importerPath), targetPath));
  if (!relative.startsWith(".")) relative = `./${relative}`;
  const originalHadExtension = sourceExtensions.has(path.extname(originalSpecifier));
  if (!originalHadExtension) {
    for (const extension of resolutionSuffixes) {
      if (relative.endsWith(extension)) {
        relative = relative.slice(0, -extension.length);
        break;
      }
    }
    if (relative.endsWith("/index") && !originalSpecifier.endsWith("/index")) relative = relative.slice(0, -"/index".length);
  }
  return relative;
}

function applyReplacements(content, replacements) {
  return [...replacements].sort((left, right) => right.start - left.start).reduce((result, replacement) => result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end), content);
}

function updateSourcePathComment(content, finalPath) {
  const relativePath = normalizeSlashes(path.relative(repositoryRoot, finalPath));
  return content.replace(/^\/\/ @source-path \[fobles\] .*$/m, `// @source-path [fobles] ${relativePath}`);
}

async function main() {
  const configuration = JSON.parse(await fs.readFile(moveMapPath, "utf8"));
  const moves = configuration.moves.map((move) => ({ from: normalize(path.join(repositoryRoot, move.from)), to: normalize(path.join(repositoryRoot, move.to)) }));
  const redirects = new Map((configuration.redirects ?? []).map((redirect) => [
    normalize(path.join(repositoryRoot, redirect.from)),
    normalize(path.join(repositoryRoot, redirect.to)),
  ]));
  for (const move of moves) {
    if (!(await exists(move.from))) throw new Error(`Move source does not exist: ${normalizeSlashes(path.relative(repositoryRoot, move.from))}`);
    if (await exists(move.to)) throw new Error(`Move destination already exists: ${normalizeSlashes(path.relative(repositoryRoot, move.to))}`);
  }

  const allFiles = await enumerateFiles(repositoryRoot);
  const sourceFiles = allFiles.filter((filePath) => sourceExtensions.has(path.extname(filePath)));
  const transformedFiles = [];
  const unresolvedRelativeImports = [];
  let rewrittenImportCount = 0;

  for (const originalPath of sourceFiles) {
    const originalContent = await fs.readFile(originalPath, "utf8");
    const scriptKind = originalPath.endsWith(".tsx") ? ts.ScriptKind.TSX : originalPath.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(originalPath, originalContent, ts.ScriptTarget.Latest, true, scriptKind);
    const finalImporterPath = mapPath(originalPath, moves);
    const replacements = [];
    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (!specifier.value.startsWith(".")) continue;
      const originalTargetPath = await resolveRelativeSpecifier(originalPath, specifier.value, redirects);
      if (!originalTargetPath) {
        unresolvedRelativeImports.push({ importer: normalizeSlashes(path.relative(repositoryRoot, originalPath)), specifier: specifier.value });
        continue;
      }
      const finalTargetPath = mapPath(originalTargetPath, moves);
      const finalSpecifier = buildRelativeSpecifier(finalImporterPath, finalTargetPath, specifier.value);
      if (finalSpecifier !== specifier.value) {
        replacements.push({ start: specifier.start, end: specifier.end, value: finalSpecifier });
        rewrittenImportCount += 1;
      }
    }
    let finalContent = applyReplacements(originalContent, replacements);
    finalContent = updateSourcePathComment(finalContent, finalImporterPath);
    transformedFiles.push({ originalPath, finalPath: finalImporterPath, content: finalContent });
  }

  const report = {
    phase: configuration.phase,
    mode: applyChanges ? "apply" : "dry-run",
    status: unresolvedRelativeImports.length > 0 ? "blocked" : applyChanges ? "applied" : "validated",
    moves: moves.map((move) => ({ from: normalizeSlashes(path.relative(repositoryRoot, move.from)), to: normalizeSlashes(path.relative(repositoryRoot, move.to)) })),
    redirects: [...redirects.entries()].map(([from, to]) => ({ from: normalizeSlashes(path.relative(repositoryRoot, from)), to: normalizeSlashes(path.relative(repositoryRoot, to)) })),
    scannedSourceFiles: sourceFiles.length,
    rewrittenImports: rewrittenImportCount,
    transformedFiles: transformedFiles.filter((file) => file.originalPath !== file.finalPath || file.content !== undefined).length,
    unresolvedRelativeImports,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (unresolvedRelativeImports.length > 0) {
    throw new Error(`Unresolved relative imports (${unresolvedRelativeImports.length}). No files changed. Report: ${normalizeSlashes(path.relative(repositoryRoot, reportPath))}`);
  }

  if (applyChanges) {
    for (const move of moves) {
      await fs.mkdir(path.dirname(move.to), { recursive: true });
      await fs.rename(move.from, move.to);
    }
    for (const file of transformedFiles) {
      await fs.mkdir(path.dirname(file.finalPath), { recursive: true });
      await fs.writeFile(file.finalPath, file.content, "utf8");
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (!applyChanges) console.log("Dry run complete. Re-run with --apply to modify the repository.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
