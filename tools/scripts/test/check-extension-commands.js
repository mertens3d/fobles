import fs from "node:fs";
import path from "node:path";

// Guards against src/background/index.ts's RELAYED_COMMANDS silently drifting out of sync with
// src/public/manifest.json's "commands" (e.g. a new hotkey added to one and forgotten in the
// other) - chrome.commands.onCommand can't be fired programmatically to catch this via e2e tests
// (see tools/scripts/test memory notes), so this is a plain static text check instead.
const MANIFEST_PATH = path.resolve("src/public/manifest.json");
const CONSTANTS_PATH = path.resolve("src/shared/constants.ts");
const BACKGROUND_PATH = path.resolve("src/background/index.ts");

function readManifestCommandNames() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  return new Set(Object.keys(manifest.commands ?? {}));
}

function readMessageActionValuesByKey() {
  const source = fs.readFileSync(CONSTANTS_PATH, "utf8");
  const actionBlockMatch = source.match(/ACTION:\s*{([\s\S]*?)}/);
  if (!actionBlockMatch) {
    throw new Error("Could not find MESSAGE.ACTION block in src/shared/constants.ts");
  }

  const valuesByKey = new Map();
  for (const match of actionBlockMatch[1].matchAll(/(\w+):\s*"([^"]+)"/g)) {
    valuesByKey.set(match[1], match[2]);
  }
  return valuesByKey;
}

function readRelayedCommandNames(valuesByKey) {
  const source = fs.readFileSync(BACKGROUND_PATH, "utf8");
  const arrayMatch = source.match(/RELAYED_COMMANDS:\s*readonly string\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error("Could not find RELAYED_COMMANDS in src/background/index.ts");
  }

  const relayedCommandNames = new Set();
  for (const match of arrayMatch[1].matchAll(/MESSAGE\.ACTION\.(\w+)/g)) {
    const key = match[1];
    const value = valuesByKey.get(key);
    if (!value) {
      throw new Error(`RELAYED_COMMANDS references MESSAGE.ACTION.${key}, which has no string value in src/shared/constants.ts`);
    }
    relayedCommandNames.add(value);
  }
  return relayedCommandNames;
}

const manifestCommandNames = readManifestCommandNames();
const messageActionValuesByKey = readMessageActionValuesByKey();
const relayedCommandNames = readRelayedCommandNames(messageActionValuesByKey);

const missingFromRelay = [...manifestCommandNames].filter((name) => !relayedCommandNames.has(name));
const missingFromManifest = [...relayedCommandNames].filter((name) => !manifestCommandNames.has(name));

if (missingFromRelay.length > 0 || missingFromManifest.length > 0) {
  if (missingFromRelay.length > 0) {
    console.error(`Registered in manifest.json's "commands" but missing from RELAYED_COMMANDS: ${missingFromRelay.join(", ")}`);
  }
  if (missingFromManifest.length > 0) {
    console.error(`Listed in RELAYED_COMMANDS but missing from manifest.json's "commands": ${missingFromManifest.join(", ")}`);
  }
  process.exit(1);
}

console.log("manifest.json's commands and background/index.ts's RELAYED_COMMANDS are in sync.");
