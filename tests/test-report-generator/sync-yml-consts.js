import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

// Keeps tests/e2e/strategies/support/yml-fobles.CONST.ts's hand-transcribed `path` values in
// sync with tests/items-fobles/serialization/**/*.yml (the actual source of truth) - items get
// moved/renamed in Sitecore without anyone remembering to update the const, which then silently
// breaks locators built from `path` far later. Only rewrites `path` values; every other
// hand-picked field (fieldHint/fieldValue/displayName) is left untouched since those aren't
// simple 1:1 copies of a single YAML field.
const SERIALIZATION_ROOT = path.resolve("tests/items-fobles/serialization");
const CONST_FILE = path.resolve("tests/e2e/strategies/support/yml-fobles.CONST.ts");

function collectYmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectYmlFiles(fullPath));
    } else if (entry.name.endsWith(".yml")) {
      results.push(fullPath);
    }
  }
  return results;
}

function buildPathsByGuid() {
  const pathsByGuid = new Map();
  for (const filePath of collectYmlFiles(SERIALIZATION_ROOT)) {
    const raw = fs.readFileSync(filePath, "utf8");
    let parsed;
    try {
      parsed = parseYaml(raw);
    } catch {
      console.warn(`Skipping unparsable YAML file: ${path.relative(process.cwd(), filePath)}`);
      continue;
    }
    if (!parsed?.ID || !parsed?.Path) continue;
    pathsByGuid.set(parsed.ID.toLowerCase(), parsed.Path);
  }
  return pathsByGuid;
}

function syncConstFile(pathsByGuid) {
  const source = fs.readFileSync(CONST_FILE, "utf8");
  const entryPattern = /(id:\s*"([0-9a-fA-F-]{36})",\s*\n\s*path:\s*")([^"]*)(")/g;

  let changeCount = 0;
  const updated = source.replace(entryPattern, (match, prefix, guid, currentPath, suffix) => {
    const actualPath = pathsByGuid.get(guid.toLowerCase());
    if (!actualPath) {
      console.warn(`No serialized YAML found for id ${guid} - leaving path as-is.`);
      return match;
    }
    if (actualPath === currentPath) return match;
    changeCount += 1;
    console.log(`Updating ${guid}:\n  old: ${currentPath}\n  new: ${actualPath}`);
    return `${prefix}${actualPath}${suffix}`;
  });

  if (changeCount === 0) {
    console.log("yml-fobles.CONST.ts paths already match the serialized YAML - nothing to update.");
    return;
  }

  fs.writeFileSync(CONST_FILE, updated, "utf8");
  console.log(`Updated ${changeCount} path value(s) in ${path.relative(process.cwd(), CONST_FILE)}.`);
}

syncConstFile(buildPathsByGuid());
