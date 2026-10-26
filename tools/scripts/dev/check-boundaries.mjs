// @source-path [fobles] tools/scripts/dev/check-boundaries.mjs
// Reports imports that cross the architecture layers the wrong way (see LAYER_RULES in boundaries.mjs).
// Run from anywhere:  node tools/scripts/dev/check-boundaries.mjs
// Exit code 1 when any violation exists, so it can be wired into a build or CI step later.
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { collectEdgesFromDisk, findViolations, summarizeViolations } from "./boundaries.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ts = createRequire(path.join(repositoryRoot, "package.json"))("typescript");

const violations = findViolations(await collectEdgesFromDisk(ts, repositoryRoot));
const summary = summarizeViolations(violations);

console.log("Architecture boundary check");

if (violations.length === 0) {
  console.log("  No violations.");
} else {
  Object.entries(summary).forEach(([rule, count]) => console.log(`  ${rule}: ${count}`));
  console.log("");

  const byImporter = new Map();

  violations.forEach((violation) => {
    const list = byImporter.get(violation.importer) ?? [];

    list.push(violation);
    byImporter.set(violation.importer, list);
  });

  [...byImporter.keys()].sort().forEach((importer) => {
    console.log(importer);
    byImporter.get(importer).forEach((violation) => console.log(`    -> ${violation.target}  (${violation.targetLayer})`));
  });
}

process.exitCode = violations.length === 0 ? 0 : 1;
