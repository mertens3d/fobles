import { chromium } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

dotenv.config({
  path: [path.join(projectRoot, ".env.local"), path.join(projectRoot, ".env")],
});

const extensionPath = path.join(projectRoot, "dist", "unpacked");
const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    path.join(projectRoot, "test-artifacts/browser-profile"),
);

function getEnvironment() {
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
  const [endpoint, friendlyName] = entry
    .split("|")
    .map((value) => value.trim());

  if (!endpoint || !friendlyName) {
    throw new Error(`Invalid SITECORE_TEST_ENVIRONMENTS entry: "${entry}"`);
  }

  return { endpoint, friendlyName };
}

const environment = getEnvironment();
const targetUrl = environment.endpoint;
const maxAttempts = 1;
const retryDelayMs = 2_000;
const testArtifactsDir = path.join(projectRoot, "test-artifacts/logs");
const logFile = path.join(testArtifactsDir, "test-run.log");
fs.mkdirSync(path.dirname(logFile), { recursive: true });
const logStream = fs.createWriteStream(logFile, { flags: "w" });

const log = (message) => {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  process.stdout.write(line);
  logStream.write(line);
};

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

log(`Environment: ${environment.friendlyName}`);
log(`Profile: ${profileDir}`);
log(`Opening Sitecore root: ${targetUrl}`);
log(`Diagnostic log: ${logFile}`);

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  const page = context.pages()[0] ?? (await context.newPage());
  log(`Browser launched with ${context.pages().length} page(s).`);
  await page.goto(targetUrl, { waitUntil: "commit", timeout: 30_000 });
  log(`Initial navigation committed: ${page.url()}`);

  const logoutLink = page.getByRole("link", { name: /log\s*out/i }).first();
  if (await logoutLink.isVisible().catch(() => false)) {
    log("Existing Log out link found; logging out before manual login.");
    await logoutLink.click();
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.goto(targetUrl, { waitUntil: "commit", timeout: 30_000 });
    log(`Fresh-login navigation committed: ${page.url()}`);
  }

  log("Manual login is ready in the visible browser tab.");
  log("The next Enter starts the first test attempt.");
  const readline = createInterface({ input, output });
  await readline.question(
    "When the Content Editor is loaded and the login form is gone, press Enter to start the tests. ",
  );
  readline.close();
  log(`Enter received. Current browser URL: ${page.url()}`);
  log("Closing manual-login browser context before starting Playwright.");
  await context.close();
  log("Manual-login browser context closed.");

  const playwrightCli = path.join(
    projectRoot,
    "node_modules/@playwright/test/cli.js",
  );
  let exitCode = 1;
  let allAttemptsPassed = true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log(`Starting test attempt ${attempt} of ${maxAttempts}.`);
    const result = await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [playwrightCli, "test", "--retries=0"],
        {
          stdio: ["inherit", "pipe", "pipe"],
          env: process.env,
        },
      );
      child.stdout.on("data", (chunk) => {
        process.stdout.write(chunk);
        logStream.write(chunk);
      });
      child.stderr.on("data", (chunk) => {
        process.stderr.write(chunk);
        logStream.write(chunk);
      });
      child.on("error", (error) => {
        log(`Test attempt ${attempt} could not start: ${error.message}`);
        resolve({ code: 1, signal: null });
      });
      child.on("close", (code, signal) => {
        log(
          `Test attempt ${attempt} exited with code ${code ?? 1}${signal ? ` and signal ${signal}` : ""}.`,
        );
        resolve({ code: code ?? 1, signal });
      });
    });

    exitCode = result.code;
    if (result.signal) {
      exitCode = 1;
    }
    if (exitCode !== 0) {
      allAttemptsPassed = false;
    }

    if (attempt < maxAttempts) {
      log(
        `Test attempt ${attempt} ${exitCode === 0 ? "passed" : "failed"}. Starting attempt ${attempt + 1} in 2 seconds.`,
      );
      await delay(retryDelayMs);
    }
  }

  exitCode = allAttemptsPassed ? 0 : 1;
  log(
    `Finished all ${maxAttempts} test attempts. Final exit code: ${exitCode}.`,
  );
  process.exitCode = exitCode;
  logStream.end();
} catch (error) {
  log(
    `Orchestrator error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
  try {
    await context.close();
  } catch {
    // The context may already be closed after saving storage state.
  }
  logStream.end();
  throw error;
}
