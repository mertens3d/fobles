#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");
const packageJsonPath = join(projectRoot, "package.json");
const nvmrcPath = join(projectRoot, ".nvmrc");

const readRequiredMajorVersion = () => {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const engineVersion = packageJson?.engines?.node;
    if (typeof engineVersion === "string" && engineVersion.trim()) {
      const match = engineVersion.trim().match(/(\d+)/);
      if (match) return match[1];
    }
  } catch {
    // Fall back to .nvmrc if package.json is unavailable or invalid.
  }

  try {
    const nvmVersion = readFileSync(nvmrcPath, "utf8").trim();
    const match = nvmVersion.match(/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const REQUIRED_MAJOR = readRequiredMajorVersion();
const CURRENT_VERSION = process.version;

if (!REQUIRED_MAJOR) {
  console.error(
    "\x1b[31m\n❌ Unable to determine required Node major version\x1b[0m",
  );
  process.exit(1);
}

const REQUIRED_VERSION = `v${REQUIRED_MAJOR}`;

if (CURRENT_VERSION.startsWith(REQUIRED_VERSION)) {
  console.log(
    "\x1b[32m✓ Node version is correct (" + CURRENT_VERSION + ")\x1b[0m",
  );
  process.exit(0);
}

console.error("\x1b[31m\n❌ Node Version Mismatch\x1b[0m");
console.error("\x1b[31mRequired major: " + REQUIRED_VERSION + ".x\x1b[0m");
console.error("\x1b[31mCurrent:       " + CURRENT_VERSION + "\x1b[0m");

try {
  console.error(
    "\x1b[33m\n💡 Attempting to switch Node version with nvm...\x1b[0m\n",
  );
  const nvmVersion = readFileSync(nvmrcPath, "utf8").trim();
  execSync(`nvm use ${nvmVersion}`, { stdio: "inherit" });
  console.error("\x1b[32m✓ Node version switched successfully\x1b[0m\n");
  process.exit(0);
} catch {
  const fallback = readRequiredMajorVersion();
  console.error(
    "\x1b[33m\n💡 Try: nvm use " + (fallback ?? REQUIRED_MAJOR) + "\x1b[0m\n",
  );
  process.exit(1);
}
