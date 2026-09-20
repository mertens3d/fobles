import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: [".env.local", ".env"] });

const extensionPath = path.resolve(process.cwd(), "dist/unpacked");
const testArtifactsDir = path.resolve(process.cwd(), "tests/test-artifacts");
// --list never runs a test (no onTestEnd calls) - it still triggers onBegin/onEnd, which would
// otherwise overwrite test-report.html with an empty "0 tests" snapshot on top of a real run's
// live results, since both invocations write to the same file.
const isListOnly = process.argv.includes("--list");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  // A retry launches a fresh worker (new browser window) for that test - against this Sitecore
  // environment that means a second license slot burned on every failure. Never retry.
  retries: 0,
  // Stop the whole run after the first failure instead of continuing through remaining tests -
  // each additional test still opens/reauthenticates a Sitecore session, burning more license
  // slots for no benefit once something is already known to be broken.
  maxFailures: 1,
  // All specs share one persistent browser profile (tests/test-artifacts/browser-profile),
  // which only one process can open at a time - force serial execution across files.
  workers: 1,
  reporter: isListOnly
    ? [["list"]]
    : [
        ["list"],
        [
          path.resolve(
            process.cwd(),
            "tools/scripts/test/static-test-reporter.cjs",
          ),
          { outputFile: path.join(testArtifactsDir, "reports/test-report.html") },
        ],
      ],
  use: {
    headless: false,
    trace: "retain-on-failure",
    // Off - every test already gets scoped screenshots via our own step/data-section helpers;
    // Playwright's own whole-page auto-screenshot was just showing up as an extra, unwanted
    // attachment on the test-level row.
    screenshot: "off",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "edge",
      use: {
        browserName: "chromium",
        channel: "msedge",
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
          ],
        },
      },
    },
  ],
  webServer: undefined,
  outputDir: path.join(testArtifactsDir, "playwright-results"),
  snapshotDir: path.join(testArtifactsDir, "snapshots"),
});
