import { expect, type Frame, type Locator, type Page } from "./fixtures/playwright";
import { CONST } from "./CONST";
import { moveMouseTo, pulseMouseMarkerClick } from "./mouse-proxy";

// Reusable stock Sitecore Content Editor UI interactions (ribbon tabs, galleries), plus Fobles'
// own toolbar toggle since it's just as much a canned click sequence any spec reuses - kept
// separate from fobles-helpers.ts (which is about asserting Fobles' resulting behavior, not about
// how to reach the UI that triggers it) and out of any one spec file.

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Sitecore galleries (e.g. the Links gallery below) load their content asynchronously into a
// frame that may not exist yet at the moment this is first called - retry across page.frames()
// instead of failing on the very first pass. timeoutMs of 0 (the default) preserves the original
// single-pass, fail-fast behavior every other caller relies on.
export async function findFrameWithSelector(
  page: Page,
  selector: string,
  description: string,
  timeoutMs = 0,
): Promise<Frame> {
  console.log(`[fobles] Looking for frame with selector "${selector}"`);
  const deadline = Date.now() + timeoutMs;
  do {
    for (const frame of page.frames()) {
      if ((await frame.locator(selector).count()) > 0) {
        console.log(`[fobles] Frame with selector "${selector}" found`);
        return frame;
      }
    }
    if (Date.now() < deadline) await page.waitForTimeout(250);
  } while (Date.now() < deadline);
  throw new Error(`Could not find ${description} in any frame: ${selector}`);
}

// Moves the mouse marker to the target, flashes it, then clicks - the same move-then-click
// pattern every other interactive click in these suites uses, instead of a plain locator.click().
// Pauses afterward so the click's effect is visible on screen before the next interaction fires.
async function moveAndClick(page: Page, target: Locator, description: string): Promise<void> {
  await moveMouseTo(page, target, { x: 0, y: 0 }, description);
  await pulseMouseMarkerClick(page);
  await target.click();
  await page.waitForTimeout(STEP_WAIT_MS);
}

export async function clickRibbonTab(page: Page, frame: Frame, accessKey: string): Promise<void> {
  await moveAndClick(page, frame.locator(`a[accesskey="${accessKey}"]`).first(), `ribbon tab (${accessKey})`);
}

// Opens Content Editor's "Links" gallery (Navigate ribbon tab > Links button), which lists every
// item referencing the open item and every item it refers to in turn. Sitecore loads the gallery
// into its own dynamically created frame (see the button's showGallery(...) target), not the
// ribbon's own frame, so the panel is found by searching every frame on the page rather than
// assuming it lands in `frame`. Returns the gallery panel locator once it's visible.
export async function openLinksGallery(page: Page, frame: Frame): Promise<Locator> {
  await clickRibbonTab(page, frame, "N");
  await moveAndClick(
    page,
    frame.locator('a[title="Show referenced and referred items."]').first(),
    "Links gallery button",
  );

  const galleryFrame = await findFrameWithSelector(page, "#Links", "Links gallery panel", 10_000);
  const linksPanel = galleryFrame.locator("#Links");
  await expect(linksPanel).toBeVisible();
  return linksPanel;
}

// Moves the mouse marker to the LBolt button, flashes it, then clicks - the same
// move-then-click pattern the toolbar suite uses, instead of a plain locator.click(). Pauses
// afterward so the click's effect is visible on screen before the next interaction fires.
export async function clickLboltButton(
  page: Page,
  lboltButton: Locator,
): Promise<void> {
  await moveMouseTo(page, lboltButton, { x: 0, y: 0 }, "LBolt button");
  await pulseMouseMarkerClick(page);
  await lboltButton.click();
  await page.waitForTimeout(CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS);
}
