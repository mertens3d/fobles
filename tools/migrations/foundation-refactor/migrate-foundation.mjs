// @source-path [fobles] tools/migrations/foundation-refactor/migrate-foundation.mjs
//
// One phase of the Foundation refactor. A phase file (copied to move-map.json by invoke-foundation-migration.ps1) may contain:
//   moves        { from, to }    move a file or directory; every relative import to or from it is rewritten per importer
//   symbolMoves  { from, to, symbols }
//                relocate named exports to another module; every import of them is split and re-pointed. The destination
//                module must already exist (supplied by the payload) and the source must no longer export the symbols.
//   payload      directory of replacement/new files (<repo path>.payload) applied as part of the same step
//   replaces     { <repo path>: <sha256 of the file the payload was prepared from> }; refuses to overwrite a file that changed
//   textEdits    [{ file, edits: [{ find, replace, count } | { pattern, flags, replace, min }] }]; fail-closed edits to existing files
//   redirects    { from, to }    point a stale import at its current file
//
// Everything is computed in memory first - payload, text edits, moves, and symbol relocation - and every relative import is
// then re-resolved against the post-migration file set. If anything is wrong the run stops with a report and changes nothing.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  buildFileMap,
  buildRelativeSpecifier,
  collectExportedNames,
  collectModuleSpecifiers,
  enumerateFiles,
  normalizeSlashes,
  parseSource,
  pathKey,
  resolveInMap,
  SOURCE_EXTENSIONS,
  toRepoRelative,
} from "../../scripts/dev/module-graph.mjs";
import { findViolations, summarizeViolations } from "../../scripts/dev/boundaries.mjs";

const migrationDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(migrationDirectory, "../../..");
const ts = createRequire(path.join(repositoryRoot, "package.json"))("typescript");
const applyChanges = process.argv.includes("--apply");
const forcePayload = process.argv.includes("--force-payload");
const moveMapPath = path.join(migrationDirectory, "move-map.json");
const reportPath = path.join(migrationDirectory, "foundation-migration-report.json");

const absolute = (relativePath) => path.resolve(repositoryRoot, relativePath);
const relative = (absolutePath) => toRepoRelative(repositoryRoot, absolutePath);
const lf = (text) => text.replaceAll("\r\n", "\n");
const digest = (text) => crypto.createHash("sha256").update(lf(text)).digest("hex");
const isSource = (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath));

async function kindOf(filePath) {
  let kind;

  try {
    kind = (await fs.stat(filePath)).isDirectory() ? "directory" : "file";
  } catch {
    kind = undefined;
  }

  return kind;
}

function isWithin(candidate, parent) {
  const relativePath = path.relative(parent, candidate);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function applyTextEdits(content, edits, label, blocking) {
  const crlf = content.includes("\r\n");
  let text = lf(content);

  edits.forEach((edit, index) => {
    const replacement = lf(edit.replace ?? "");

    if (edit.find !== undefined) {
      const find = lf(edit.find);
      const expected = edit.count ?? 1;
      const occurrences = text.split(find).length - 1;

      if (occurrences === expected) text = text.split(find).join(replacement);
      else blocking.push({ kind: "text-edit-mismatch", file: label, edit: index, detail: `expected ${expected} occurrence(s), found ${occurrences}`, find: find.slice(0, 140) });
    } else {
      const flags = edit.flags ?? "g";
      const matches = [...text.matchAll(new RegExp(edit.pattern, flags.includes("g") ? flags : `${flags}g`))].length;

      if (matches >= (edit.min ?? 1)) text = text.replace(new RegExp(edit.pattern, flags), replacement);
      else blocking.push({ kind: "text-edit-mismatch", file: label, edit: index, detail: `pattern matched ${matches} time(s)`, pattern: edit.pattern.slice(0, 140) });
    }
  });

  return crlf ? text.replaceAll("\n", "\r\n") : text;
}

async function loadPayload(directory) {
  const overlay = new Map();

  if (directory) {
    for (const file of await enumerateFiles(directory)) {
      if (file.endsWith(".payload")) {
        const target = absolute(normalizeSlashes(path.relative(directory, file)).slice(0, -".payload".length));

        overlay.set(pathKey(target), { path: target, content: await fs.readFile(file, "utf8") });
      }
    }
  }

  return overlay;
}

async function main() {
  const configuration = JSON.parse(await fs.readFile(moveMapPath, "utf8"));
  const blocking = [];
  const warnings = [];

  const moves = (configuration.moves ?? []).map((move) => ({ from: absolute(move.from), to: absolute(move.to) }));
  const symbolMoves = (configuration.symbolMoves ?? []).map((move) => ({ from: absolute(move.from), to: absolute(move.to), symbols: move.symbols }));
  const redirects = new Map((configuration.redirects ?? []).map((redirect) => [pathKey(absolute(redirect.from)), absolute(redirect.to)]));
  const payloadDirectory = configuration.payload ? path.resolve(migrationDirectory, configuration.payload) : undefined;
  const overlay = await loadPayload(payloadDirectory);

  const mapPath = (candidate) => {
    const move = moves
      .filter((item) => isWithin(candidate, item.from))
      .sort((left, right) => right.from.length - left.from.length)[0];

    return move ? path.join(move.to, path.relative(move.from, candidate)) : candidate;
  };

  // ---- moves
  for (const move of moves) {
    if (!(await kindOf(move.from))) blocking.push({ kind: "move-source-missing", from: relative(move.from), hint: "Already applied, or the path is wrong." });
    if (await kindOf(move.to)) blocking.push({ kind: "move-destination-exists", to: relative(move.to) });
    moves.forEach((other) => {
      if (other !== move && isWithin(other.to, move.from)) blocking.push({ kind: "move-overlap", from: relative(move.from), to: relative(other.to) });
    });
  }

  // ---- payload safety: never overwrite a file that changed since the payload was prepared
  const replaces = configuration.replaces ?? {};

  for (const [relativePath, expectedDigest] of Object.entries(replaces)) {
    const target = absolute(relativePath);

    if (!overlay.has(pathKey(target))) blocking.push({ kind: "payload-file-missing", file: relativePath });
    else if (!(await kindOf(target))) blocking.push({ kind: "replace-target-missing", file: relativePath });
    else if (!forcePayload && digest(await fs.readFile(target, "utf8")) !== expectedDigest) {
      blocking.push({ kind: "modified-since-payload", file: relativePath, hint: "The file changed after this payload was prepared. Re-collect it, or pass -ForcePayload to overwrite it anyway." });
    }
  }

  for (const entry of overlay.values()) {
    const relativePath = relative(entry.path);

    if (!(relativePath in replaces) && (await kindOf(entry.path))) {
      const onDisk = await fs.readFile(entry.path, "utf8");

      if (lf(onDisk) !== lf(entry.content)) blocking.push({ kind: "new-file-already-exists", file: relativePath });
    }
  }

  // ---- files: disk plus payload
  const diskFiles = await enumerateFiles(repositoryRoot, { excludeDirectories: payloadDirectory ? [payloadDirectory] : [] });
  const diskKeys = new Set(diskFiles.map((file) => pathKey(file)));
  const preFiles = [...diskFiles];

  overlay.forEach((entry, key) => {
    if (!diskKeys.has(key)) preFiles.push(entry.path);
  });

  const preMap = buildFileMap(preFiles);
  const textEditsByKey = new Map((configuration.textEdits ?? []).map((item) => [pathKey(absolute(item.file)), { file: item.file, edits: item.edits }]));
  const effective = new Map();

  for (const file of preFiles.filter(isSource)) {
    const key = pathKey(file);
    const onDisk = diskKeys.has(key);
    const diskContent = onDisk ? await fs.readFile(file, "utf8") : undefined;
    let content = overlay.has(key) ? overlay.get(key).content : diskContent;
    const textEdit = textEditsByKey.get(key);

    if (textEdit) content = applyTextEdits(content, textEdit.edits, textEdit.file, blocking);
    effective.set(key, { path: file, onDisk, diskContent, content });
  }

  textEditsByKey.forEach((item, key) => {
    if (!effective.has(key)) blocking.push({ kind: "text-edit-target-missing", file: item.file });
  });

  // ---- symbol moves: the destination must define the symbols and the source must have stopped exporting them
  for (const move of symbolMoves) {
    const from = effective.get(pathKey(move.from));
    const to = effective.get(pathKey(move.to));

    if (!from) blocking.push({ kind: "symbol-source-missing", from: relative(move.from) });
    if (!to) blocking.push({ kind: "symbol-destination-missing", to: relative(move.to), hint: "The payload must supply it." });

    if (from && to) {
      const fromExports = collectExportedNames(ts, parseSource(ts, from.path, from.content));
      const toExports = collectExportedNames(ts, parseSource(ts, to.path, to.content));

      move.symbols.forEach((symbol) => {
        if (fromExports.has(symbol)) blocking.push({ kind: "symbol-still-exported", symbol, from: relative(move.from), hint: "Replace the source file first." });
        if (!toExports.has(symbol)) blocking.push({ kind: "symbol-not-exported-by-destination", symbol, to: relative(move.to) });
      });
    }
  }

  const symbolMovesByFrom = new Map();

  symbolMoves.forEach((move) => {
    const list = symbolMovesByFrom.get(pathKey(move.from)) ?? [];

    list.push(move);
    symbolMovesByFrom.set(pathKey(move.from), list);
  });

  const resolveBefore = (importerPath, specifier) => {
    const redirected = redirects.get(pathKey(path.resolve(path.dirname(importerPath), specifier)));

    return redirected ? { status: "resolved", path: redirected } : resolveInMap(importerPath, specifier, preMap);
  };

  // ---- transform every source file
  const records = [];
  const statistics = { rewrittenSpecifiers: 0, splitImports: 0 };
  const staleImports = [];
  const staleKeys = new Set();

  for (const entry of effective.values()) {
    const finalPath = mapPath(entry.path);
    const sourceFile = parseSource(ts, entry.path, entry.content);
    const eol = entry.content.includes("\r\n") ? "\r\n" : "\n";
    const edits = [];

    for (const specifier of collectModuleSpecifiers(ts, sourceFile)) {
      if (!specifier.value.startsWith(".")) continue;

      const resolution = resolveBefore(entry.path, specifier.value);

      if (resolution.status === "unresolved" && finalPath === entry.path) {
        // Already broken before this phase, and the file is not being moved, so its specifier text stays exactly as it is.
        // That is not this phase's problem: report it, leave it alone, and do not let it block the move.
        staleImports.push({ importer: relative(entry.path), specifier: specifier.value });
        staleKeys.add(`${pathKey(entry.path)}::${specifier.value}`);
        continue;
      }

      if (resolution.status !== "resolved") {
        blocking.push({ kind: resolution.status, importer: relative(entry.path), specifier: specifier.value, ...(resolution.matches ? { matches: resolution.matches.map(relative) } : {}) });
        continue;
      }

      const moveList = symbolMovesByFrom.get(pathKey(resolution.path));

      if (moveList && specifier.kind === "import") {
        const split = splitSymbolImport({ declaration: specifier.declaration, sourceFile, content: entry.content, moveList, finalImporterPath: finalPath, fromTarget: resolution.path, specifierValue: specifier.value, eol, mapPath });

        if (split.blocking) {
          blocking.push({ kind: "symbol-import-not-splittable", importer: relative(entry.path), specifier: specifier.value, detail: split.blocking });
          continue;
        }

        if (split.edit) {
          edits.push(split.edit);
          statistics.splitImports += 1;
          continue;
        }
      } else if (moveList && specifier.kind === "export") {
        const clause = specifier.declaration.exportClause;
        const names = clause && ts.isNamedExports(clause) ? clause.elements.map((element) => (element.propertyName ?? element.name).text) : ["*"];
        const relocated = names.filter((name) => name === "*" || moveList.some((move) => move.symbols.includes(name)));

        if (relocated.length > 0) blocking.push({ kind: "symbol-reexport", importer: relative(entry.path), specifier: specifier.value, detail: `re-exports ${relocated.join(", ")}` });
      } else if (moveList) {
        warnings.push({ kind: "relocated-module-referenced-dynamically", importer: relative(entry.path), specifier: specifier.value, usage: specifier.kind });
      }

      const finalSpecifier = buildRelativeSpecifier(finalPath, mapPath(resolution.path), specifier.value);

      if (finalSpecifier !== specifier.value) {
        edits.push({ start: specifier.start, end: specifier.end, text: finalSpecifier });
        statistics.rewrittenSpecifiers += 1;
      }
    }

    const ordered = [...edits].sort((left, right) => right.start - left.start);

    ordered.forEach((edit, index) => {
      const next = ordered[index - 1];

      if (next && edit.end > next.start) blocking.push({ kind: "overlapping-edits", importer: relative(entry.path) });
    });

    let finalContent = ordered.reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), entry.content);

    if (finalPath !== entry.path) finalContent = finalContent.replace(/^\/\/ @source-path \[fobles\] .*$/m, `// @source-path [fobles] ${relative(finalPath)}`);

    records.push({ originalPath: entry.path, finalPath, onDisk: entry.onDisk, diskContent: entry.diskContent, finalContent });
  }

  // ---- re-resolve everything against the post-migration file set, and collect the final import graph
  const finalMap = buildFileMap(preFiles.map(mapPath));
  const relocatedSymbols = new Map(symbolMoves.map((move) => [pathKey(mapPath(move.from)), move]));
  const edges = [];

  for (const record of records) {
    const sourceFile = parseSource(ts, record.finalPath, record.finalContent);

    for (const specifier of collectModuleSpecifiers(ts, sourceFile)) {
      if (!specifier.value.startsWith(".")) continue;

      const resolution = resolveInMap(record.finalPath, specifier.value, finalMap);

      if (resolution.status !== "resolved") {
        if (!staleKeys.has(`${pathKey(record.finalPath)}::${specifier.value}`)) {
          blocking.push({ kind: "unresolved-after-migration", importer: relative(record.finalPath), specifier: specifier.value });
        }

        continue;
      }

      edges.push({ importer: relative(record.finalPath), target: relative(resolution.path), specifier: specifier.value });

      const relocation = relocatedSymbols.get(pathKey(resolution.path));
      const clause = specifier.kind === "import" ? specifier.declaration.importClause : undefined;

      if (relocation && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        clause.namedBindings.elements.forEach((element) => {
          if (relocation.symbols.includes((element.propertyName ?? element.name).text)) {
            blocking.push({ kind: "relocated-symbol-still-imported-from-source", importer: relative(record.finalPath), symbol: (element.propertyName ?? element.name).text });
          }
        });
      }
    }
  }

  const violations = findViolations(edges);
  const changed = records.filter((record) => record.finalContent !== record.diskContent);
  const moved = records.filter((record) => record.finalPath !== record.originalPath);
  const status = blocking.length > 0 ? "blocked" : applyChanges ? "applied" : "validated";

  const report = {
    phase: configuration.phase,
    mode: applyChanges ? "apply" : "dry-run",
    status,
    moves: moves.map((move) => ({ from: relative(move.from), to: relative(move.to) })),
    symbolMoves: symbolMoves.map((move) => ({ from: relative(move.from), to: relative(move.to), symbols: move.symbols })),
    payloadFiles: [...overlay.values()].map((entry) => relative(entry.path)),
    scannedSourceFiles: records.length,
    movedSourceFiles: moved.length,
    changedSourceFiles: changed.length,
    rewrittenSpecifiers: statistics.rewrittenSpecifiers,
    splitSymbolImports: statistics.splitImports,
    boundaryViolations: { total: violations.length, byRule: summarizeViolations(violations), details: violations.slice(0, 300).map(({ importer, target, importerLayer, targetLayer }) => ({ importer, target, rule: `${importerLayer} -> ${targetLayer}` })) },
    blocking,
    warnings,
    preExistingStaleImports: staleImports,
  };

  if (applyChanges && status !== "blocked") {
    for (const move of moves) {
      await fs.mkdir(path.dirname(move.to), { recursive: true });
      await fs.rename(move.from, move.to);
    }

    for (const record of changed) {
      await fs.mkdir(path.dirname(record.finalPath), { recursive: true });
      await fs.writeFile(record.finalPath, record.finalContent, "utf8");
    }
  }

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printSummary(report);
  process.exitCode = status === "blocked" ? 1 : 0;
}

function splitSymbolImport({ declaration, sourceFile, content, moveList, finalImporterPath, fromTarget, specifierValue, eol, mapPath }) {
  const clause = declaration.importClause;
  let result = {};

  if (clause) {
    const bindings = clause.namedBindings;
    const named = bindings && ts.isNamedImports(bindings) ? bindings : undefined;
    const importedName = (element) => (element.propertyName ?? element.name).text;
    const groups = moveList
      .map((move) => ({ move, elements: named ? named.elements.filter((element) => move.symbols.includes(importedName(element))) : [] }))
      .filter((group) => group.elements.length > 0);

    if (bindings && ts.isNamespaceImport(bindings)) {
      result = { blocking: "namespace import of a module whose symbols are being relocated" };
    } else if (groups.length > 0 && clause.name) {
      result = { blocking: "default import combined with relocated symbols" };
    } else if (groups.length > 0) {
      const moved = new Set(groups.flatMap((group) => group.elements));
      const remaining = named.elements.filter((element) => !moved.has(element));
      const start = declaration.getStart(sourceFile);
      const declarationText = content.slice(start, declaration.getEnd());
      const quote = content[declaration.moduleSpecifier.getStart(sourceFile)];
      const semicolon = declarationText.trimEnd().endsWith(";") ? ";" : "";
      const multiline = /\r?\n/.test(declarationText);
      const keyword = clause.isTypeOnly ? "import type" : "import";
      const render = (elements, specifier) => {
        const items = elements.map((element) => element.getText(sourceFile));

        return multiline
          ? `${keyword} {${eol}${items.map((item) => `  ${item},`).join(eol)}${eol}} from ${quote}${specifier}${quote}${semicolon}`
          : `${keyword} { ${items.join(", ")} } from ${quote}${specifier}${quote}${semicolon}`;
      };
      const parts = [];

      if (remaining.length > 0) parts.push(render(remaining, buildRelativeSpecifier(finalImporterPath, mapPath(fromTarget), specifierValue)));

      groups.forEach((group) => {
        // The importer being the new home itself means the symbols are now local; nothing to import.
        if (mapPath(group.move.to) !== finalImporterPath) parts.push(render(group.elements, buildRelativeSpecifier(finalImporterPath, mapPath(group.move.to), "module")));
      });

      result = { edit: { start, end: declaration.getEnd(), text: parts.join(eol) } };
    }
  }

  return result;
}

function printSummary(report) {
  console.log(`Foundation migration: ${report.phase} (${report.mode}) - ${report.status.toUpperCase()}`);
  console.log(`  source files scanned: ${report.scannedSourceFiles}, moved: ${report.movedSourceFiles}, changed: ${report.changedSourceFiles}`);
  console.log(`  import specifiers rewritten: ${report.rewrittenSpecifiers}, symbol imports split: ${report.splitSymbolImports}`);
  console.log(`  boundary violations after this phase: ${report.boundaryViolations.total}`);
  Object.entries(report.boundaryViolations.byRule).forEach(([rule, count]) => console.log(`    ${rule}: ${count}`));

  report.boundaryViolations.details.slice(0, 40).forEach((violation) => console.log(`      ${violation.importer}\n        -> ${violation.target}  (${violation.rule})`));
  if (report.boundaryViolations.total > 40) console.log(`      ... and ${report.boundaryViolations.total - 40} more in the report`);

  if (report.preExistingStaleImports.length > 0) {
    console.log(`  PRE-EXISTING stale imports left untouched (${report.preExistingStaleImports.length}) - already broken before this phase:`);
    report.preExistingStaleImports.forEach((item) => console.log(`      ${item.importer}\n        -> ${item.specifier}`));
  }

  if (report.warnings.length > 0) console.log(`  warnings: ${report.warnings.length} (see report)`);

  if (report.blocking.length > 0) {
    console.log(`  BLOCKING PROBLEMS (${report.blocking.length}) - nothing was changed:`);
    report.blocking.slice(0, 40).forEach((item) => console.log(`    - ${JSON.stringify(item)}`));
    if (report.blocking.length > 40) console.log(`    ... and ${report.blocking.length - 40} more in the report`);
  }

  console.log(`  report: ${relative(reportPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
