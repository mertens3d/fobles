import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: [".env.local", ".env"] });

const extensionPath = path.resolve(process.cwd(), "dist/unpacked");
const testArtifactsDir = path.resolve(process.cwd(), "test-artifacts");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  workers: 1,
  retries: 0,
  reporter: [
    [
      "json",
      { outputFile: path.join(testArtifactsDir, "logs/playwright-report.json") },
    ],
    [
      path.resolve(
        process.cwd(),
        "tools/scripts/test/static-test-reporter.cjs",
      ),
      {
        outputFile: path.join(
          testArtifactsDir,
          "reports/browser-test-report.html",
        ),
      },
    ],
  ],
  use: {
    headless: false,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
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
