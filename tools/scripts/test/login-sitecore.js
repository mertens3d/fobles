import { chromium } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

dotenv.config({
  path: [path.join(projectRoot, ".env.local"), path.join(projectRoot, ".env")],
});

const extensionPath = path.join(projectRoot, "dist", "unpacked");
const authDirectory = path.join(projectRoot, "test-artifacts", "auth");
const authStatePath = path.join(authDirectory, "sitecore.json");
const cdpPort = Number(process.env.PLAYWRIGHT_CDP_PORT ?? "9222");
const cdpUrl = `http://127.0.0.1:${cdpPort}`;
const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    path.join(projectRoot, "test-artifacts/browser-profile"),
);

function getSitecoreRoot() {
  const raw = process.env.SITECORE_TEST_ENVIRONMENTS?.trim();
  if (!raw) {
    throw new Error(
      "SITECORE_TEST_ENVIRONMENTS is required. Configure it as endpoint|friendlyName|version.",
    );
  }

  const entry = raw
    .split(/\r?\n|;/)
    .map((value) => value.trim())
    .find(Boolean);
  const [endpoint] = entry.split("|").map((value) => value.trim());
  if (!endpoint)
    throw new Error(`Invalid SITECORE_TEST_ENVIRONMENTS entry: "${entry}"`);
  return endpoint;
}

const rootUrl = getSitecoreRoot();
const edgeExecutable =
  process.env.PLAYWRIGHT_EDGE_PATH ??
  (process.arch === "x64"
    ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    : "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe");
console.log(`Using CDP browser profile: ${profileDir}`);
console.log(`Starting Edge for CDP at ${cdpUrl}`);
const edgeProcess = spawn(edgeExecutable, [
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionPath}`,
  `--load-extension=${extensionPath}`,
  "--no-first-run",
  "--no-default-browser-check",
  rootUrl,
], { detached: true, stdio: "ignore" });
edgeProcess.unref();

let browser;
for (let attempt = 1; attempt <= 30; attempt += 1) {
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
    break;
  } catch (error) {
    if (attempt === 30) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
const context = browser.contexts()[0];
if (!context) throw new Error("CDP Edge browser did not expose a context.");
console.log(
  `Connected to CDP browser with ${context.pages().length} page(s).`,
);

try {
  const page = context.pages()[0] ?? (await context.newPage());
  console.log(`Login browser page URL: ${page.url()}`);
  await page.goto(rootUrl, { waitUntil: "commit", timeout: 30_000 });
  console.log(`Opened Sitecore root: ${rootUrl}`);
  console.log("Log in manually in the visible browser.");

  const readline = createInterface({ input, output });
  await readline.question(
    "After Sitecore is logged in, press Enter to save the persistent profile and close the browser. ",
  );
  readline.close();
  console.log(`Enter received. Current browser URL: ${page.url()}`);
  console.log("Waiting for Sitecore to finish the login/session handoff.");
  await page.waitForURL(
    (url) => !url.hostname.toLowerCase().includes("auth.sitecorecloud.io"),
    { timeout: 60_000 },
  );
  await page.waitForLoadState("domcontentloaded");
  console.log(`Sitecore login succeeded at ${page.url()}`);
  fs.mkdirSync(authDirectory, { recursive: true });
  await context.storageState({ path: authStatePath });
  console.log(`Saved authentication state to ${authStatePath}`);
  console.log("Saving the persistent profile and closing the browser.");
} finally {
  // Leave the externally launched Edge process running for the test workers.
}
