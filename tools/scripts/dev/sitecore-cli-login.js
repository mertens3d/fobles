#!/usr/bin/env node

import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { promptForSuffix } from "./sitecore-cli-target-prompt.js";
import { getCliLoginTargets } from "./fobles-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

function buildArgs(target) {
  const args = [
    "sitecore",
    "login",
    "-n",
    target.endpointName,
    "--cm",
    target.cmUrl,
    "--authority",
    target.authorityUrl,
    "--client-id",
    target.clientId,
    "--allow-write",
    "true",
  ];
  if (target.audience) args.push("--audience", target.audience);
  if (target.asDefault) args.push("--as-default");
  return args;
}

// inherit stdio - the login flow opens a browser and waits on an interactive prompt/device code.
function runLogin(target) {
  const args = buildArgs(target);
  console.log(`\x1b[36mdotnet ${args.join(" ")}\x1b[0m`);
  return spawnSync("dotnet", args, { cwd: projectRoot, stdio: "inherit" }).status ?? 1;
}

const allTargets = getCliLoginTargets();
const requestedName = process.argv[2];

let targets;
if (requestedName) {
  const match = allTargets.find((target) => target.endpointName === requestedName);
  if (!match) {
    console.error(`\x1b[31m\n❌ No cliLoginTargets entry named "${requestedName}" in fobles.environments.json.\x1b[0m`);
    process.exit(1);
  }
  targets = [match];
} else if (allTargets.length > 1 && process.stdin.isTTY) {
  // Only worth prompting with more than one target and an actual human at the keyboard - CI/non-
  // TTY runs (and the single-target case) keep the old "just run everything configured" default.
  const entries = allTargets.map((target) => ({ suffix: target.endpointName, label: target.endpointName }));
  const picked = await promptForSuffix(entries, { allowAll: true, message: "Which Sitecore CLI login target?" });
  targets = picked ? [allTargets.find((target) => target.endpointName === picked)] : allTargets;
} else {
  targets = allTargets;
}

if (targets.length === 0) {
  console.error("\x1b[31m\n❌ No Sitecore CLI login targets configured.\x1b[0m");
  console.error("\x1b[33mCopy fobles.environments.example.json to fobles.environments.json and fill in cliLoginTargets.\x1b[0m");
  process.exit(1);
}

let exitCode = 0;
for (const target of targets) {
  const status = runLogin(target);
  if (status !== 0) exitCode = status;
}

process.exit(exitCode);


