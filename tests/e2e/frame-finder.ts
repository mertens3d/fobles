import type { Frame, Page } from "./fixtures/playwright";
import { CONST } from "./CONST";

// Retries across page.frames() since a frame (e.g. a Sitecore gallery) can load asynchronously
// after this is first called. timeoutMs of 0 (default) is a single fail-fast pass.
export async function findFrameWithSelector(
  page: Page,
  selector: string,
  description: string,
  timeoutMs = 0,
): Promise<Frame> {
  console.log(`[fobles] Looking for ${description} (selector: ${selector}), waiting up to ${timeoutMs}ms`);
  const deadline = Date.now() + timeoutMs;
  do {
    for (const frame of page.frames()) {
      if ((await frame.locator(selector).count()) > 0) {
        console.log(`[fobles] Found ${description} in frame ${frame.url()}`);
        return frame;
      }
    }
    if (Date.now() < deadline) await page.waitForTimeout(250);
  } while (Date.now() < deadline);
  console.log(
    `[fobles] Gave up looking for ${description} - checked ${page.frames().length} frame(s): ${page
      .frames()
      .map((frame) => frame.url())
      .join(", ")}`,
  );
  throw new Error(`Could not find ${description} in any frame: ${selector}`);
}

// A freshly navigated page's toolbar takes a moment for the content script to inject - unlike
// findFrameWithSelector's own zero-timeout default, this always needs to actually wait for it.
export async function findFoblesFrame(page: Page): Promise<Frame> {
  return findFrameWithSelector(page, CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER, "Fobles toolbar", 10_000);
}
