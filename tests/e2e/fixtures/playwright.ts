import {
  chromium,
  type Browser,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
  test as base,
} from "@playwright/test";
import {
  initializeTestLogging,
  runWithTestLogger,
  setActiveTestLogger,
  startTestLogger,
  type TestLogger,
} from "../../testLogger";

const cdpUrl = process.env.PLAYWRIGHT_CDP_URL ?? "http://127.0.0.1:9222";

initializeTestLogging();
let executedTestNumber = 0;

type TestFixtures = {
  testLogger: TestLogger;
};

type WorkerFixtures = {
  browserContext: BrowserContext;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  testLogger: async ({}, use, testInfo) => {
    const logger = startTestLogger({
      testName: testInfo.titlePath.join(" > "),
      retry: testInfo.retry,
      testNumber: ++executedTestNumber,
      totalTests: Number(process.env.FOBLES_TOTAL_TESTS) || undefined,
      sourceLine: testInfo.line,
    });
    logger.startTest();
    setActiveTestLogger(logger);
    try {
      await runWithTestLogger(logger, () => use(logger));
    } finally {
      setActiveTestLogger(undefined);
    }
  },
  browserContext: [
    async ({}, use) => {
      const activeTestLogger = startTestLogger({
        testName: "browser diagnostics",
        retry: 0,
      });
      const browser: Browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0];
      if (!context) throw new Error(`No browser context available at ${cdpUrl}`);
      activeTestLogger.step("Connected to CDP browser", {
        cdpUrl,
        pageUrls: context.pages().map((page) => page.url()),
      });
      const attachPageDiagnostics = (
        page: import("@playwright/test").Page,
      ): void => {
        page.on("console", (message) => {
          const location = message.location().url;
          const label = `[browser console:${message.type()}]`;
          const browserMessage =
            `${label} ${message.text()}${location ? ` (${location})` : ""}`;
          if (message.type() === "warning") {
            activeTestLogger.browserWarning(browserMessage);
          } else {
            activeTestLogger.browserError(browserMessage);
          }
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            activeTestLogger.browserError(
              `[browser response:${response.status()}] ${response.request().method()} ${response.url()}`,
            );
          }
        });
        page.on("pageerror", (error) => {
            activeTestLogger.browserError(
              `[browser pageerror] ${error.stack ?? error.message}`,
            );
        });
        page.on("requestfailed", (request) => {
          activeTestLogger.browserError(
            `[browser requestfailed] ${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown error"}`,
          );
        });
      };

      context.pages().forEach(attachPageDiagnostics);
      context.on("page", attachPageDiagnostics);
      await use(context);
    },
    { scope: "worker" },
  ],
  page: async ({ browserContext, testLogger: activeTestLogger }, use) => {
    const page = browserContext.pages()[0] ?? (await browserContext.newPage());
    activeTestLogger.step("Using browser tab", { url: page.url() });
    await runWithTestLogger(activeTestLogger, () => use(page));
  },
});

export { expect } from "@playwright/test";
export type { Frame, Locator, Page } from "@playwright/test";
