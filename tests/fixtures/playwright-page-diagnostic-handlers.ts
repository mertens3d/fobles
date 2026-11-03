// @source-path [Fobles] tests/fixtures/playwright-page-diagnostic-handlers.ts

import type { Page, BrowserContext, Request } from "@playwright/test";
import { logDiagnostic } from "./playwright-logging";
import { TEST_CONST } from "../constants/TEST_CONST";

export function attachPageDiagnosticHandlers(context: BrowserContext): void {
  const pageDiagnostics = (page: Page): void => {
    page.on("console", (message) => {
      const location = message.location().url;
      if (location && isIgnorableDiagnosticUrl(location)) {
        return;
      }

      if (message.type() === "warning") {
        if (!isIgnorableConsoleWarning(message.text())) {
          logDiagnostic(`[browser console:${message.type()}] ${message.text()}${location ? ` (${location})` : ""}`);
        }
      } else if (message.type() === "error") {
        if (!isIgnorableConsoleError(message.text())) {
          logDiagnostic(`[browser console:${message.type()}] ${message.text()}${location ? ` (${location})` : ""}`);
        }
      }
    });

    page.on("response", (response) => {
      if (response.status() >= 400 && !isIgnorableDiagnosticUrl(response.url())) {
        logDiagnostic(`[browser response:${response.status()}] ${response.request().method()} ${response.url()}`);
      }
    });

    page.on("pageerror", (error) => {
      logDiagnostic(`[browser pageerror] ${error.stack ?? error.message}`);
    });

    page.on("requestfailed", (request) => {
      if (!isIgnorableRequestFailure(request)) {
        logDiagnostic(
          `[browser requestfailed] ${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown error"}`,
        );
      }
    });

    // Uncomment to diagnose redirects and iframe navigation.
    //page.on("framenavigated", (frame) => {
    // const kind = frame === page.mainFrame() ? "main frame" : "iframe";
    // logDiagnostic(`[browser framenavigated:${kind}] ${frame.url()}`);
    //});

    page.on("crash", () => {
      logDiagnostic(`[browser crash] page render process crashed at ${page.url()}`);
    });
  };

  context.pages().forEach(pageDiagnostics);
  context.on("page", pageDiagnostics);
}

// Ignore missing Sitecore icons unrelated to Fobles.
function isIgnorableDiagnosticUrl(url: string): boolean {
  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_DIAGNOSTIC_URL_PATTERN.test(url);
}

// Ignore the known Chromium warning repeated on Sitecore iframe navigation.
function isIgnorableConsoleWarning(text: string): boolean {
  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_CONSOLE_WARNING_PATTERN.test(text);
}

function isIgnorableConsoleError(text: string): boolean {
  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORABLE_CONSOLE_MESSAGES.some((msg) => text.includes(msg));
}

function isIgnorableRequestFailure(request: Request): boolean {
  const errorText = request.failure()?.errorText ?? "";

  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_REQUEST_FAILURES.some((ignored) => errorText.includes(ignored));
}
