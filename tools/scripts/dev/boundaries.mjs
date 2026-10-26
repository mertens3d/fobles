// @source-path [fobles] tools/scripts/dev/boundaries.mjs
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildFileMap,
  collectModuleSpecifiers,
  enumerateFiles,
  parseSource,
  resolveInMap,
  SOURCE_EXTENSIONS,
  toRepoRelative,
} from "./module-graph.mjs";

// The layers of src/content and which of them each layer may not depend on.
//   foundation  headless services: workers, harvesting, caches, Reference Model, Sitecore access
//   shell       specialist lifetime: work sessions, health supervision, cleanup
//   features    Graph, Auditor, and any future specialist tool
//   shared-ui   shared components and dialogs
//   shared      other shared code
//   toolbar / macros   Sitecore-page UI (macros only until they move into foundation)
export const LAYER_RULES = [
  {
    importer: "foundation",
    forbidden: ["features", "shell", "toolbar", "macros", "shared-ui"],
    reason: "Foundation must stay headless: no UI, features, or Shell.",
  },
  {
    importer: "shared",
    forbidden: ["features", "shell"],
    reason: "Shared code must not depend on features or Shell.",
  },
];

export function layerOf(repoRelativePath) {
  const p = repoRelativePath;
  let layer = "other";

  if (p.startsWith("src/content/foundation/")) layer = "foundation";
  else if (p.startsWith("src/content/features/")) layer = "features";
  else if (p.startsWith("src/content/shell/")) layer = "shell";
  else if (p.startsWith("src/content/shared/ui/") || p.startsWith("src/content/shared/dialog/")) layer = "shared-ui";
  else if (p.startsWith("src/content/shared/")) layer = "shared";
  else if (p.startsWith("src/content/toolbar/")) layer = "toolbar";
  else if (p.startsWith("src/content/macros/")) layer = "macros";

  return layer;
}

// edges: [{ importer, target, specifier }] with repo-relative, forward-slash paths.
export function findViolations(edges) {
  const violations = [];

  edges.forEach((edge) => {
    const importerLayer = layerOf(edge.importer);
    const targetLayer = layerOf(edge.target);

    LAYER_RULES.forEach((rule) => {
      if (rule.importer === importerLayer && rule.forbidden.includes(targetLayer)) {
        violations.push({ ...edge, importerLayer, targetLayer, reason: rule.reason });
      }
    });
  });

  return violations;
}

export function summarizeViolations(violations) {
  const counts = new Map();

  violations.forEach((violation) => {
    const key = `${violation.importerLayer} -> ${violation.targetLayer}`;

    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

// Reads the repository as it is on disk now.
export async function collectEdgesFromDisk(ts, repositoryRoot) {
  const files = await enumerateFiles(repositoryRoot);
  const fileMap = buildFileMap(files);
  const edges = [];

  for (const file of files.filter((candidate) => SOURCE_EXTENSIONS.has(path.extname(candidate)))) {
    const relativeImporter = toRepoRelative(repositoryRoot, file);

    if (!relativeImporter.startsWith("src/")) continue;

    const sourceFile = parseSource(ts, file, await fs.readFile(file, "utf8"));

    collectModuleSpecifiers(ts, sourceFile).forEach((specifier) => {
      if (!specifier.value.startsWith(".")) return;

      const resolution = resolveInMap(file, specifier.value, fileMap);

      if (resolution.status === "resolved") {
        edges.push({ importer: relativeImporter, target: toRepoRelative(repositoryRoot, resolution.path), specifier: specifier.value });
      }
    });
  }

  return edges;
}
