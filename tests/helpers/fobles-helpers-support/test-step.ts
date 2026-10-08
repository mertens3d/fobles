import { test, type Page, type TestInfo } from "@playwright/test";
import { CONST } from "../../CONST";
import type { FoblesStep } from "../fobles-test-step.types";
import { attachPageScreenshot, type Screenshottable } from "./screenshots";
import { buildStepMatchKey } from "./step-match-key";

// A step whose body navigates away (e.g. a Fobles button's plain click) leaves screenshotTarget
// pointing at a now-detached frame - screenshotting a detached element can hang indefinitely
// instead of erroring, which a plain .catch() never protects against. Bound it so a bad
// screenshotTarget costs a few seconds, not the whole test's 90s timeout.
const STEP_SCREENSHOT_TIMEOUT_MS = 5_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), timeoutMs),
    ),
  ]);
}

// The relative URL (path + query, no origin) of the page being tested - reports commit screenshots
// to a public repo, so the actual hostname must never appear in report text. page.url() can throw
// on a closed/mid-navigation page; "(unknown)" is a safe fallback rather than letting that mask
// whatever the step body itself threw.
function relativeUrl(page: Page): string {
  try {
    const url = new URL(page.url());
    return `${url.pathname}${url.search}`;
  } catch {
    return "(unknown)";
  }
}

// Every check (test.step) should have a screenshot by default, without each call site remembering
// to take one - wraps test.step so a screenshot is always attached, pass or fail. Named after the
// step title itself so the report can match it back to the exact step it belongs to. Defaults to
// a whole-page screenshot; pass screenshotTarget to scope it down (e.g. to a section panel). Pass
// titlePrefix (e.g. a strategy name) so the report's step list is identifiable on its own, without
// needing to cross-reference the parent test row. Pass { screenshot: false } for steps that
// already attach their own, more meaningful screenshot (e.g. click-navigation steps attach the
// landed-on page's Quick Info panel instead) - screenshotTarget would otherwise still capture the
// original page, which adds a redundant, less useful image. body receives this step's own full
// (prefixed) title, so a body that attaches its own named screenshot/note (e.g.
// attachItemPathScreenshot, expectFoblesButtonSameTabNavigation/NewTabNavigation) can name it after
// that instead of a value another step in the same test might share.

export function createFoblesStep(
  page: Page,
  testInfo: TestInfo,
  screenshotTarget: Screenshottable = page,
  titlePrefix?: string,
): FoblesStep {
  return async (title, body, options) => {
    const fullTitle = titlePrefix ? `${titlePrefix}: ${title}` : title;
    console.log(`${CONST.TESTING.LOG.STEP_DIVIDER}`);
    console.log(`[fobles] Step starting: ${fullTitle}`);
    console.log(`${CONST.TESTING.LOG.STEP_DIVIDER}`);
    await test.step(
      fullTitle,
      async () => {
        try {
          await body(fullTitle);
        } finally {
          // Attached unconditionally (pass or fail) so every step shows which page it ran
          // against, not just failed ones - named after fullTitle so the report matches it to
          // this exact step (see attachActualFoValueNote for why a shared value can't be used).
          const safeName = buildStepMatchKey(fullTitle);
          await testInfo
            .attach(`page-url-${safeName}.txt`, {
              body: Buffer.from(`test page: ${relativeUrl(page)}`),
              contentType: "text/plain",
            })
            .catch(() => {
              // Best-effort - never mask the step's real pass/fail outcome.
            });

          if (options?.screenshot !== false) {
            await withTimeout(
              attachPageScreenshot(
                testInfo,
                screenshotTarget,
                `step-${safeName}.png`,
              ),
              STEP_SCREENSHOT_TIMEOUT_MS,
            ).catch(() => {
              // Best-effort - a screenshot failure (e.g. page mid-navigation) must never mask the
              // step's real pass/fail outcome.
            });
          }
        }
      },
      options,
    );
    console.log(
      `[fobles] Step finished: ${titlePrefix ? `${titlePrefix}: ${title}` : title}`,
    );
    console.log(`${CONST.TESTING.LOG.STEP_DIVIDER}`);
  };
}
