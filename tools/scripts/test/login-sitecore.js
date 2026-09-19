import { chromium } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";
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
const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    path.join(projectRoot, "tests/test-artifacts/browser-profile"),
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
console.log(`Using persistent profile: ${profileDir}`);
const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(rootUrl, { waitUntil: "commit", timeout: 30_000 });
  console.log(`Opened Sitecore root: ${rootUrl}`);
  console.log("Log in manually in the visible browser.");

  const readline = createInterface({ input, output });
  await readline.question(
    "After Sitecore is logged in, press Enter to save the persistent profile and close the browser. ",
  );
  readline.close();
  console.log(`Enter received. Current browser URL: ${page.url()}`);
  console.log(
    "Allowing Sitecore two seconds to finish the login/session handoff.",
  );
  await page.waitForTimeout(2_000);
  console.log("Saving the persistent profile and closing the browser.");
} finally {
  await context.close();
}
