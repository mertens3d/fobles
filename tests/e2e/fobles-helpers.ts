import { expect, test, type Frame, type Locator, type Page } from "./fixtures/playwright";
import { openSitecorePage } from "./fixtures/sitecore";
import type { FoblesExpectation } from "./scenarios";
import { moveMouseTo, pulseMouseMarkerClick, showMouseMarker, verifyMouseMarker } from "./mouse-proxy";
import { CONST } from "./CONST";
import type { TestInfo } from "@playwright/test";

type Screenshottable = Pick<Locator, "screenshot">;

export async function findFrameWithSelector(
  page: Page,
  selector: string,
  description: string,
): Promise<Frame> {
  console.log(`[fobles] Looking for frame with selector "${selector}"`);
  for (const frame of page.frames()) {
    if ((await frame.locator(selector).count()) > 0) {
      console.log(`[fobles] Frame with selector "${selector}" found`);
      return frame;
    }
  }
  throw new Error(`Could not find ${description} in any frame: ${selector}`);
}

// Shared by every field-strategy test (strategies/*.spec.ts) - navigates to the scenario item,
// shows the mouse marker (matching the toolbar suite's visual style), and locates the field's
// table by its label text plus the toolbar's feature button.
export async function activateFoblesForFieldStrategy(
  page: Page,
  itemId: string,
  fieldLabel: string,
): Promise<{ foblesFrame: Frame; fieldTable: Locator; lboltButton: Locator }> {
  console.log(`[fobles] Opening strategy item ${itemId}`);
  await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${itemId}`);
  console.log(`[fobles] Navigation finished at ${page.url()}`);
  await showMouseMarker(page);

  console.log(`[fobles] Looking for the LBolt button in a frame`);
  const foblesFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
    "LBolt button",
  );
  console.log(`[fobles] LBolt button frame found`);
  await showMouseMarker(foblesFrame);

  console.log(`[fobles] Looking for field "${fieldLabel}"`);
  const fieldTable = foblesFrame
    .locator(`xpath=//*[contains(text(), '${fieldLabel}')]/ancestor::table[1]`)
    .first();
  const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
  console.log(`[fobles] Strategy field activation setup complete`);

  return { foblesFrame, fieldTable, lboltButton };
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

// Sitecore's own "fo" query param is either a bare GUID (braces stripped by Fobles'
// normalizeFoblesValue before building the URL) or a content path (e.g.
// "/sitecore/system/Modules/Fobles Testing") - callers may still pass a braced GUID (matching how
// it's usually written in test constants), so strip braces unconditionally; a plain path is
// unaffected since it never contains any.
function normalizeFoValueForCompare(value: string): string {
  return value.replace(/[{}]/g, "").toUpperCase();
}

function assertFoblesTargetUrl(actualUrl: string, expectedFoValue: string): void {
  const url = new URL(actualUrl);
  expect(decodeURIComponent(url.pathname)).toBe(CONST.SITECORE.PATHS.CONTENT_EDITOR.split("?")[0]);
  expect(url.searchParams.get("fo") ? normalizeFoValueForCompare(url.searchParams.get("fo")!) : null).toBe(
    normalizeFoValueForCompare(expectedFoValue),
  );
}

// A Fobles item button's plain click navigates the current tab - Sitecore's own eligibility is
// not our concern (per AGENTS.md scope: Fobles' job ends at sending the right URL), so this only
// asserts the URL we land on, not what Content Editor does with it. Fobles shows a same-tab
// navigation confirmation dialog by default (fresh profile, FOBLES_NAV_WARNING_VISIBLE defaults to
// true) - click through it if it appears. expectedFoValue is whatever the "fo" query param should
// be - a bare GUID for most strategies, or a content path for Internal Link. Also attaches a
// Quick Info "Item path" screenshot of the landed-on item, for visual confirmation alongside the
// URL assertion.
export async function expectFoblesButtonSameTabNavigation(
  page: Page,
  testInfo: TestInfo,
  button: Locator,
  expectedFoValue: string,
): Promise<void> {
  await moveMouseTo(page, button, { x: 0, y: 0 }, "Fobles item button");
  await pulseMouseMarkerClick(page);
  await button.click();

  const confirmDialog = page.locator(".fobles-confirm-dialog").first();
  await confirmDialog.waitFor({ state: "visible", timeout: 3_000 }).catch(() => {
    // No confirmation configured (warning setting off) - navigation already proceeded.
  });
  if (await confirmDialog.isVisible().catch(() => false)) {
    await confirmDialog.locator(".fobles-confirm-dialog-continue").click();
  }

  await page.waitForURL((url) => url.searchParams.has("fo"));
  assertFoblesTargetUrl(page.url(), expectedFoValue);
  await attachItemPathScreenshot(page, testInfo, expectedFoValue);
}

// A Fobles item button's Ctrl/Cmd-click opens the target in a new tab, leaving the current page
// untouched - verify the popup's URL, then close it without disturbing the rest of the test. Also
// attaches a Quick Info "Item path" screenshot of the popup before closing it.
export async function expectFoblesButtonNewTabNavigation(
  page: Page,
  testInfo: TestInfo,
  button: Locator,
  expectedFoValue: string,
): Promise<void> {
  await moveMouseTo(page, button, { x: 0, y: 0 }, "Fobles item button");
  await pulseMouseMarkerClick(page);

  const [popup] = await Promise.all([
    page.context().waitForEvent("page"),
    button.click({ modifiers: ["Control"] }),
  ]);
  await popup.waitForLoadState("domcontentloaded");
  assertFoblesTargetUrl(popup.url(), expectedFoValue);
  await attachItemPathScreenshot(popup, testInfo, expectedFoValue);
  await popup.close();
}

// toHaveScreenshot() only attaches its comparison images to the test result on a mismatch/missing
// baseline - a clean pass produces no attachment for the report to link to. Attach one ourselves
// so the report always has a link, pass or fail. Must use `path` (not `body`) - the reporter links
// to attachments by file path, and body-only attachments never get one.
export async function attachScreenshot(
  testInfo: TestInfo,
  target: Screenshottable,
  name: string,
  options?: { mask?: Locator[] },
): Promise<void> {
  const filePath = testInfo.outputPath(name);
  const autoMasks = await getSensitiveAutoMasks(target);
  const mask = [...(options?.mask ?? []), ...autoMasks];
  // Matches toHaveScreenshot()'s defaults - reduces (but can't fully eliminate) visible flicker
  // from CDP's screenshot capture in headed mode.
  await target.screenshot({ path: filePath, animations: "disabled", caret: "hide", mask: mask.length ? mask : undefined });
  await testInfo.attach(name, { path: filePath, contentType: "image/png" });
}

// A Locator knows its owning Page; a Page is already one. Needed because a screenshot target can
// be either (a field's own table, a Quick Info row, or the whole page), but the locators below
// always live on the top-level page regardless of which frame/element is being screenshotted.
function getOwningPage(target: Screenshottable): Page {
  return typeof (target as Locator).page === "function" ? (target as Locator).page() : (target as Page);
}

// page.locator() only searches the main frame - some quick-menu targets (e.g. the Installation
// Wizard shell application) render inside a nested iframe instead, so a selector's presence has to
// be checked frame-by-frame rather than assumed to be in the top-level document.
async function framesWithSelector(page: Page, selector: string): Promise<Frame[]> {
  const matches: Frame[] = [];
  for (const frame of page.frames()) {
    if ((await frame.locator(selector).count().catch(() => 0)) > 0) matches.push(frame);
  }
  return matches;
}

// Sensitive content that should never appear unmasked in a screenshot, regardless of which call
// site takes it - checked automatically instead of requiring every caller to opt in. Each entry
// resolves to no masks when its content isn't present on the page being screenshotted.
async function getSensitiveAutoMasks(target: Screenshottable): Promise<Locator[]> {
  const page = getOwningPage(target);
  const masks: Locator[] = [];

  // Sitecore's shell chrome shows the logged-in username in the upper-right corner
  // (ul.sc-accountInformation's second <li>) on every authenticated page.
  for (const frame of await framesWithSelector(page, CONST.SITECORE.SELECTORS.ACCOUNT_INFO)) {
    masks.push(frame.locator(CONST.SITECORE.SELECTORS.ACCOUNT_INFO).first().locator("li").last());
  }

  // The browser's built-in XML viewer (e.g. /sitecore/admin/showconfig.aspx, reached via the
  // Fobles menu's "Show Config" button) marks each expanded node with class "opened" - showconfig
  // dumps the live web.config, including connection strings, so mask every expanded node.
  for (const frame of await framesWithSelector(page, ".opened")) {
    masks.push(frame.locator(".opened"));
  }

  // showservicesconfig.aspx ("Show Services Config" quick-menu button) lists every registered DI
  // service in a <tbody> - scope the mask to its own #ServicesForm container so unrelated tables
  // (e.g. Content Editor field tables) are never affected.
  for (const frame of await framesWithSelector(page, "#ServicesForm tbody")) {
    masks.push(frame.locator("#ServicesForm tbody"));
  }

  // cache.aspx ("Cache" quick-menu button) lists every cache's name/size in a nested table next
  // to the "Caches (NNN)" section title - mask that nested table (found relative to the title
  // span, since it has no id/class of its own) rather than the whole page.
  for (const frame of await framesWithSelector(page, "#c_cacheTitle")) {
    masks.push(frame.locator("#c_cacheTitle").locator("xpath=ancestor::tr[1]//table"));
  }

  // jobs.aspx ("Jobs" quick-menu button) lists Running/Queued/Finished jobs, each rendered as
  // either a "No jobs" placeholder or a table.jobs-table - no per-section wrapper element exists,
  // so mask both possible shapes directly rather than trying to select "the section".
  const jobsSelector = '.wf-content table.jobs-table, .wf-content b:has-text("No jobs")';
  for (const frame of await framesWithSelector(page, jobsSelector)) {
    masks.push(frame.locator(jobsSelector));
  }

  // logs.aspx ("Logs" quick-menu button) lists every log file name/link in #LogTypes.
  for (const frame of await framesWithSelector(page, "#LogTypes")) {
    masks.push(frame.locator("#LogTypes"));
  }

  // stats.aspx ("Stats" quick-menu button) lists rendering/item stats in plain, unstyled
  // <table>s scoped to its own #form1 - mask every table in it.
  for (const frame of await framesWithSelector(page, "#form1 table")) {
    masks.push(frame.locator("#form1 table"));
  }

  // dbbrowser.aspx ("DB Browser" quick-menu button) shows a full item tree in div.content - scope
  // to a .content that actually contains the tree browser (#tree), since ".content" alone is too
  // generic to safely mask on every page.
  for (const frame of await framesWithSelector(page, "div.content:has(#tree)")) {
    masks.push(frame.locator("div.content:has(#tree)"));
  }

  // Installation Wizard ("Installation Wizard" quick-menu button, a shell application likely
  // rendered inside a nested frame) shows the selected package's filename in #PackageFile.
  for (const frame of await framesWithSelector(page, "#PackageFile")) {
    masks.push(frame.locator("#PackageFile"));
  }

  return masks;
}

// A screenshot name can't contain path separators or most punctuation - jump targets are Sitecore
// paths (e.g. "/sitecore/media library/Project"), so collapse anything unsafe into a dash.
export function toSafeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

// Playwright's own attachment storage appends "-png-<40-char-hash>.png" to whatever name we give
// testInfo.attach() - combined with a long test folder name and a verbose, strategy-prefixed step
// title, the full absolute path can exceed Windows' 260-character MAX_PATH limit (confirmed: some
// viewers report "file not found" for a file that genuinely exists, once over that limit). Cap our
// own portion of the name well short of that, independent of how long the actual step title is.
const MAX_STEP_SCREENSHOT_NAME_LENGTH = 40;

// A step whose body navigates away (e.g. a Fobles button's plain click) leaves screenshotTarget
// pointing at a now-detached frame - screenshotting a detached element can hang indefinitely
// instead of erroring, which a plain .catch() never protects against. Bound it so a bad
// screenshotTarget costs a few seconds, not the whole test's 90s timeout.
const STEP_SCREENSHOT_TIMEOUT_MS = 5_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), timeoutMs)),
  ]);
}

// Every check (test.step) should have a screenshot by default, without each call site remembering
// to take one - wraps test.step so a screenshot is always attached, pass or fail. Named after the
// step title itself so the report can match it back to the exact step it belongs to. Defaults to
// a whole-page screenshot; pass screenshotTarget to scope it down (e.g. to a section panel). Pass
// titlePrefix (e.g. a strategy name) so the report's step list is identifiable on its own, without
// needing to cross-reference the parent test row. Pass { screenshot: false } for steps that
// already attach their own, more meaningful screenshot (e.g. click-navigation steps attach the
// landed-on page's Quick Info panel instead) - screenshotTarget would otherwise still capture the
// original page, which adds a redundant, less useful image.
export function createStep(
  page: Page,
  testInfo: TestInfo,
  screenshotTarget: Screenshottable = page,
  titlePrefix?: string,
): (
  title: string,
  body: () => Promise<void>,
  options?: { timeout?: number; screenshot?: boolean },
) => Promise<void> {
  return async (title, body, options) => {
    const fullTitle = titlePrefix ? `${titlePrefix}: ${title}` : title;
    console.log(`[fobles] Step starting: ${fullTitle}`);
    await test.step(
      fullTitle,
      async () => {
        try {
          await body();
        } finally {
          if (options?.screenshot !== false) {
            const safeName = toSafeFileName(fullTitle).slice(0, MAX_STEP_SCREENSHOT_NAME_LENGTH);
            await withTimeout(
              attachScreenshot(testInfo, screenshotTarget, `step-${safeName}.png`),
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
  };
}

// Screenshots just the "Item path" row of Content Editor's quick-info panel (switching to the
// Content tab first if needed) - shows which item a jump landed on without the full-page noise,
// and without the Item owner row a whole-quick-info screenshot would also expose.
export async function attachItemPathScreenshot(
  page: Page,
  testInfo: TestInfo,
  jumpTargetPath: string,
): Promise<void> {
  const frame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.CONTENT_TAB,
    "Content Editor tab header",
  );

  const contentTab = frame
    .locator(CONST.SITECORE.SELECTORS.CONTENT_TAB, {
      hasText: CONST.SITECORE.LABELS.CONTENT_TAB,
    })
    .first();
  if (await contentTab.isVisible().catch(() => false)) {
    await contentTab.click();
  }

  const itemPathRow = frame
    .locator(`${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr`, {
      hasText: CONST.SITECORE.LABELS.ITEM_PATH,
    })
    .first();
  await expect(itemPathRow).toBeVisible();
  const safeName = toSafeFileName(jumpTargetPath).slice(0, MAX_STEP_SCREENSHOT_NAME_LENGTH);
  await attachScreenshot(testInfo, itemPathRow, `item-path-${safeName}.png`);
}

// Every ancestor-based attempt to find "the whole section" reliably broke on some field-strategy
// template or another (different templates nest their sections at different DOM depths) - even a
// Playwright chained locator scoped a search back to fieldTable's own subtree despite a leading
// "//", so it couldn't reach a sibling caption div either. fieldTable itself has never failed once
// across any test this session, so use it directly instead of continuing to guess at ancestor
// structure - the trade-off is not showing sibling fields for wider context.
export function getEditorSectionLocator(fieldTable: Locator): Locator {
  return fieldTable;
}

async function logActivationState(frame: Frame, message: string): Promise<void> {
  const state = await frame.evaluate(() => ({
    persistedState: localStorage.getItem("fobles_state"),
    foblesButtons: document.querySelectorAll("[data-is-fobles-button='1']").length,
    foblesWrappers: document.querySelectorAll("[data-fobles-wrapper]").length,
  }));
  console.log(`${message}: ${JSON.stringify(state)}`);
}

export async function activateFobles(
  page: Page,
  scenario: FoblesExpectation,
): Promise<Frame> {
  console.log(`[fobles] Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  console.log(`[fobles] Navigation finished at ${page.url()}`);

  await expect
    .poll(
      async () => {
        for (const frame of page.frames()) {
          if ((await frame.locator(`#${scenario.treeNodeId}`).count()) > 0) {
            return true;
          }
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  const treeFrame = await findFrameWithSelector(
    page,
    `#${scenario.treeNodeId}`,
    `tree node #${scenario.treeNodeId}`,
  );
  await treeFrame.locator(`#${scenario.treeNodeId}`).click();

  const foblesFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
    "LBolt button",
  );
  await logActivationState(foblesFrame, "[fobles] LBolt setup before click");
  await showMouseMarker(foblesFrame);
  const lboltButton = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)
    .first();
  await expect(lboltButton).toBeVisible();
  await lboltButton.click();
  console.log(
    `[fobles] LBolt clicked; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}

export async function activateFoblesForJumpTest(
  page: Page,
  scenario: FoblesExpectation,
): Promise<Frame> {
  console.log(`[fobles] Opening ${scenario.url}`);
  await openSitecorePage(page, scenario.url);
  console.log(`[fobles] Navigation finished at ${page.url()}`);
  await showMouseMarker(page);
  await verifyMouseMarker(page);

  const foblesFrame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
    "LBolt button",
  );
  await logActivationState(foblesFrame, "[fobles] Jump setup before LBolt click");
  await showMouseMarker(foblesFrame);
  const lboltButton = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)
    .first();
  await expect(lboltButton).toBeVisible();
  await clickLboltButton(page, lboltButton);
  console.log(
    `[fobles] LBolt clicked for jump test; persisted state now ${await foblesFrame.evaluate(() => localStorage.getItem("fobles_state"))}`,
  );
  return foblesFrame;
}
