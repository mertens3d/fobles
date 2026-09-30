#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { promptForSuffix } from "./sitecore-cli-target-prompt.js";
import { getCliLoginTargets } from "./fobles-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

// Matches this repo's own module naming convention (tests/items-fobles/*.module.json's
// "fobles.*" namespaces) - override with a positional arg for a different pattern.
const DEFAULT_INCLUDE = "fobles*";

const allTargets = getCliLoginTargets();
const include = process.argv[3] || DEFAULT_INCLUDE;
let endpointName = process.argv[2];

// A pull always targets exactly one environment (no "All", unlike login) - if none was given on
// the command line, prompt from whatever's configured rather than guessing which one is meant.
if (!endpointName && process.stdin.isTTY && allTargets.length > 0) {
  const entries = allTargets.map((target) => ({ suffix: target.endpointName, label: target.endpointName }));
  endpointName = await promptForSuffix(entries, { message: "Which Sitecore CLI target to pull from?" });
}

if (!endpointName) {
  console.error("\x1b[31m\n❌ Usage: node sitecore-cli-pull.js <endpointName> [include-pattern]\x1b[0m");
  console.error("\x1b[33mExample: npm run sitecoreCLI:pull -- xp103 fobles*\x1b[0m");
  process.exit(1);
}

const target = allTargets.find((t) => t.endpointName === endpointName);
if (!target) {
  console.error(`\x1b[31m\n❌ No cliLoginTargets entry named "${endpointName}" in fobles.environments.json.\x1b[0m`);
  console.error("\x1b[33mLog in to that target first with npm run sitecoreCLI:login.\x1b[0m");
  process.exit(1);
}

const args = ["sitecore", "ser", "pull", "--environment-name", target.endpointName, "--include", include];

console.log(`\x1b[36mdotnet ${args.join(" ")}\x1b[0m`);

// inherit stdio - a pull can prompt (e.g. confirming overwrites) and streams progress output.
const result = spawnSync("dotnet", args, { cwd: projectRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
