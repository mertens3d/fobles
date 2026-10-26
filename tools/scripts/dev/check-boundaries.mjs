// @source-path [fobles] tools/scripts/dev/check-boundaries.mjs
// Reports imports that cross the architecture layers the wrong way (see LAYER_RULES in boundaries.mjs).
//
//   node tools/scripts/dev/check-boundaries.mjs                  enforced rules only; exit 1 on a violation (this is what the build runs)
//   node tools/scripts/dev/check-boundaries.mjs --features       also list rules not enforced yet and imports between features
//   node tools/scripts/dev/check-boundaries.mjs --features --fail-on-feature-crossings
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  collectEdgesFromDisk,
  findFeatureCrossings,
  findReportOnlyViolations,
  findViolations,
  summarizeViolations,
} from "./boundaries.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ts = createRequire(path.join(repositoryRoot, "package.json"))("typescript");
const options = new Set(process.argv.slice(2));

const edges = await collectEdgesFromDisk(ts, repositoryRoot);
const violations = findViolations(edges);
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

let failed = violations.length > 0;

if (options.has("--features")) {
  const reportOnly = findReportOnlyViolations(edges);
  const crossings = findFeatureCrossings(edges);

  console.log("");
  console.log("Not enforced yet");

  if (reportOnly.length === 0) {
    console.log("  Shared UI -> features/shell: none.");
  } else {
    Object.entries(summarizeViolations(reportOnly)).forEach(([rule, count]) => console.log(`  ${rule}: ${count}`));
    reportOnly.forEach((violation) => console.log(`    ${violation.importer}\n      -> ${violation.target}  (${violation.targetLayer})`));
  }

  console.log("");
  console.log("Imports between features");

  if (crossings.length === 0) {
    console.log("  None.");
  } else {
    const byPair = new Map();
    const byTarget = new Map();

    crossings.forEach((crossing) => {
      const pair = `${crossing.importerFeature} -> ${crossing.targetFeature}`;

      byPair.set(pair, (byPair.get(pair) ?? 0) + 1);

      const entry = byTarget.get(crossing.target) ?? { importers: new Set(), feature: crossing.targetFeature };

      entry.importers.add(crossing.importer);
      byTarget.set(crossing.target, entry);
    });

    [...byPair.entries()].sort(([left], [right]) => left.localeCompare(right)).forEach(([pair, count]) => console.log(`  ${pair}: ${count}`));
    console.log("");
    console.log("  Files other features import (most imported first) - the candidates to move into shared/ or foundation/:");

    [...byTarget.entries()]
      .sort(([leftPath, left], [rightPath, right]) => right.importers.size - left.importers.size || leftPath.localeCompare(rightPath))
      .forEach(([target, entry]) => {
        console.log(`    ${target}  (${entry.importers.size} importer${entry.importers.size === 1 ? "" : "s"})`);
        [...entry.importers].sort().forEach((importer) => console.log(`        <- ${importer}`));
      });
  }

  if (options.has("--fail-on-feature-crossings") && crossings.length > 0) failed = true;
}

process.exitCode = failed ? 1 : 0;
