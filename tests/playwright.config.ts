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
// Each test set (toolbar/strategies/editor) gets its own report file, so running one doesn't
// wipe out the others' - detected from the file/dir arguments already on the command line (see
// package.json's test:e2e:toolbar/test:e2e:strategies/test:e2e:editor), not a separate flag to
// keep in sync. Anything else (a full test:e2e run, or an ad-hoc single-file command outside any
// of them) falls back to the original shared "test-report.html" name.
const argsText = process.argv.join(" ");
const reportSuiteName = argsText.includes("tests/e2e/toolbar")
  ? "toolbar"
  : argsText.includes("tests/e2e/strategies")
    ? "strategies"
    : argsText.includes("tests/e2e/editor")
      ? "editor"
      : argsText.includes("tests/e2e/promoVideo")
        ? "promoVideo"
        : null;
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
            "tools/scripts/test/static-test-reporter.cjs",
          ),
          {
            outputFile: path.join(testArtifactsDir, "reports", reportFileName),
            // A browser tab popping up mid-recording is disruptive to a promoVideo session -
            // every other suite keeps the normal auto-open behavior.
            autoOpenInBrowser: reportSuiteName !== "promoVideo",
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
