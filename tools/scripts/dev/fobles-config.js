import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

const CONFIG_FILE_NAME = "fobles.environments.json";
const EXAMPLE_FILE_NAME = "fobles.environments.example.json";

let cachedConfig;

function readConfigFile() {
  const configPath = path.resolve(projectRoot, CONFIG_FILE_NAME);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `No ${CONFIG_FILE_NAME} found at the repo root. Copy ${EXAMPLE_FILE_NAME} to ${CONFIG_FILE_NAME} and fill in your own environments/CLI targets.`,
    );
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function validateConfig(config) {
  if (!Array.isArray(config?.testEnvironments) || config.testEnvironments.length === 0) {
    throw new Error(`${CONFIG_FILE_NAME}: "testEnvironments" must be a non-empty array.`);
  }
  if (!Array.isArray(config.cliLoginTargets)) {
    throw new Error(`${CONFIG_FILE_NAME}: "cliLoginTargets" must be an array.`);
  }
  return config;
}

// Cached - every consumer within a single process run (a tools/scripts/dev/*.js script, or the
// whole Playwright test run) shares one parsed+validated read rather than re-reading the file.
export function loadFoblesConfig() {
  if (!cachedConfig) cachedConfig = validateConfig(readConfigFile());
  return cachedConfig;
}

export function getTestEnvironments() {
  return loadFoblesConfig().testEnvironments;
}

// Exactly one testEnvironments entry should be marked active - that's the one every test run uses.
export function getActiveTestEnvironment() {
  const active = getTestEnvironments().filter((environment) => environment.active);
  if (active.length === 0) {
    throw new Error(`${CONFIG_FILE_NAME}: no testEnvironments entry has "active": true.`);
  }
  if (active.length > 1) {
    throw new Error(
      `${CONFIG_FILE_NAME}: more than one testEnvironments entry has "active": true - only one may be active at a time.`,
    );
  }
  return active[0];
}

export function getCliLoginTargets() {
  return loadFoblesConfig().cliLoginTargets;
}

export function getCliLoginTarget(endpointName) {
  return getCliLoginTargets().find((target) => target.endpointName === endpointName);
}
