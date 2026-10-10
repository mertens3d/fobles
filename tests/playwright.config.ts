import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

// PLAYWRIGHT_AUTH_DIR/PLAYWRIGHT_PROFILE_DIR are the only settings still read from .env - test
// environments, Sitecore CLI login targets, and test user credentials live in
// fobles.environments.json instead (see tests/fixtures/environment.ts).
dotenv.config({ path: [".env.local", ".env"] });

const extensionPath = path.resolve(process.cwd(), "dist/unpacked");
const testArtifactsDir = path.resolve(process.cwd(), "tests/test-artifacts");
// --list never runs a test (no onTestEnd calls) - it still triggers onBegin/onEnd, which would
// otherwise overwrite test-report.html with an empty "0 tests" snapshot on top of a real run's
// live results, since both invocations write to the same file.
const isListOnly = process.argv.includes("--list");
// Normalized to forward slashes so a Windows-style backslash path (e.g. pasted/tab-completed in
// PowerShell) still matches these forward-slash patterns below, instead of silently falling
// through to the generic "default" test-report.html.
const argsText = process.argv.join(" ").replace(/\\/g, "/");

// Matched on "e2e/..." rather than "tests/e2e/..." - an invocation's cwd (repo root vs tests/
// itself) or an absolute path (e.g. the VS Code Test Explorer's "Run Test" button) changes
// whatever comes before "e2e/", but never that segment itself.
function getReportSuiteName(args: string): string | null {
  if (args.includes("e2e/toolbar")) return "toolbar";
  if (args.includes("e2e/extension-ui")) {
    if (args.includes("e2e/extension-ui/persistence")) return "extension-ui-persistence";
    if (args.includes("e2e/extension-ui/toolbar-integration")) return "extension-ui-toolbar";
    if (args.includes("e2e/extension-ui/extension-integration")) return "extension-ui-runtime";
    return "extension-ui";
  }
  if (args.includes("e2e/strategies")) return "strategies";
  if (args.includes("e2e/editor")) return "editor";
  if (args.includes("e2e/pages")) return "pages";
  if (args.includes("e2e/promo-video")) return "promo-video";
  return null;
}

// Each focused test set gets its own report file so running one group does not overwrite another.
const reportSuiteName = getReportSuiteName(argsText);
const reportFileName = reportSuiteName ? `test-report-${reportSuiteName}.html` : "test-report.html";
// Video recording is a hardcoded RECORD_VIDEO constant in tests/e2e/fixtures/playwright.ts, not
// anything computed here - flip it by hand before/after a promoVideo recording session.

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
            "tests/test-report-generator/static-test-reporter.ts",
          ),
          {
            outputFile: path.join(testArtifactsDir, "reports", reportFileName),
          },
        ],
      ],
  use: {
    headless: false,
    trace: "retain-on-failure",
    // Off - every test already gets scoped screenshots via our own step/data-section helpers;
    // Playwright's own whole-page auto-screenshot was just showing up as an extra, unwanted
    // attachment on the test-level row.
    screenshot: "off",
    // video (Playwright's own built-in option) has no effect here - sharedBrowserContext
    // (tests/e2e/fixtures/playwright.ts) calls launchPersistentContext directly, bypassing the
    // context/page fixtures this setting normally configures. That fixture's own RECORD_VIDEO
    // constant controls recording instead (see its own comment for why).
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

console.log("config loaded", import.meta.url);
// throw new Error("THIS IS THE CONFIG");