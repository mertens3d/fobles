import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  activateFoblesForJumpTest,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton, findFoblesFrame } from "../sitecore-macros";
import { getLastKnownMousePosition, moveMouseTo, pulseMouseMarkerClick, showMouseMarker } from "../mouse-proxy";
import { FOBLES } from "../strategies/CONST";
import { STRATEGY_SCENARIOS } from "../strategies/strategy-scenarios";
import { EDITOR_SCENARIOS } from "../editor/editor-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
// Longer than STEP_WAIT_MS on purpose - that constant is tuned for functional-test pacing, not for
// a human watching the recording to actually register each scene before the next one starts.
const SCENE_PAUSE_MS = 2_500;
// Narration labels for this script's own mouse-move logging - not reused outside this file, unlike
// the shared CONST.SITECORE.SELECTORS/LABELS entries below.
const MOUSE_MOVE_LABEL = {
  MENU_TRIGGER: "Quick menu trigger",
  TREE_JUMP: "Tree jump",
  TREE_JUMP_CTRL_CLICK: "Tree jump (Ctrl+click)",
} as const;

// A single, deliberately short walkthrough for recording a store-listing promo video (not part of
// the normal regression suite's assertions-first style) - runs through a couple of field
// strategies, the Quick Info panel, and a tree-jump click and Ctrl+click. Run with
// `npm run test:e2e:promoVideo` (playwright.config.ts turns video recording on for anything under
// tests/e2e/promoVideo, since the normal suite only keeps failure videos). Target runtime: under
// 1:45 - trim clips in an editor afterward rather than padding this script out.
// Toolbar drag is deliberately left out for now - it was hanging live (see toolbar-drag.spec.ts
// for the real regression test) and isn't worth blocking a first working recording on; add it back
// once that's root-caused.
// ASK AGAIN: should the strict expect(...) calls below (toBeVisible/toHaveText/etc.) become
// non-fatal waits instead, so a scenario-data mismatch doesn't abort the whole recording? Left as
// strict assertions for now - revisit with the user.
test.describe("Promo: short feature walkthrough", () => {
  test("field strategies, Quick Info, and tree jumps", async ({ page }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const step = createStep(page, testInfo, page, "Promo");

    const dropLink = STRATEGY_SCENARIOS.DROP_LINK;
    await step("Drop Link: toggling Fobles decorates the field", async () => {
      const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
        page,
        dropLink.itemId,
        dropLink.fieldLabel,
      );
      await clickLboltButton(page, lboltButton);
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(dropLink.expectedButtonText);
      await page.waitForTimeout(SCENE_PAUSE_MS);
    }, { screenshot: false });

    const multilist = STRATEGY_SCENARIOS.MULTILIST_OPTIONS;
    await step("Multilist: toggling Fobles decorates the field", async () => {
      const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
        page,
        multilist.itemId,
        multilist.fieldLabel,
      );
      await clickLboltButton(page, lboltButton);
      const foblesButtons = getEditorSectionLocator(fieldTable).locator(FOBLES.SELECTORS.BUTTON);
      await expect(foblesButtons.first()).toBeVisible();
      await page.waitForTimeout(SCENE_PAUSE_MS);
    }, { screenshot: false });

    const quickInfo = EDITOR_SCENARIOS.QUICK_INFO_SECTION;
    await step("Quick Info: toggling Fobles decorates the panel", async () => {
      await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${quickInfo.itemId}`);
      await showMouseMarker(page);

      const foblesFrame = await findFoblesFrame(page);
      await showMouseMarker(foblesFrame);
      const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
      await clickLboltButton(page, lboltButton);

      const quickInfoTable = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE).first();
      await expect(quickInfoTable.locator(FOBLES.SELECTORS.WRAPPER).first()).toBeVisible();
      await page.waitForTimeout(SCENE_PAUSE_MS);
    }, { screenshot: false });

    const jumpScenario = CONST.SCENARIOS[0];
    await step("Tree jump: plain click navigates in the current tab", async () => {
      const foblesFrame = await activateFoblesForJumpTest(page, jumpScenario);
      const menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
      const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
      const mousePosition = getLastKnownMousePosition();

      await moveMouseTo(page, menuButton, mousePosition, MOUSE_MOVE_LABEL.MENU_TRIGGER);
      await menuButton.click();
      await page.waitForTimeout(STEP_WAIT_MS);
      await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

      const jumpButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON).first();
      await expect(jumpButton).toBeVisible();
      await moveMouseTo(page, jumpButton, mousePosition, MOUSE_MOVE_LABEL.TREE_JUMP);
      await pulseMouseMarkerClick(page);
      await jumpButton.click();

      const confirmationDialog = foblesFrame.getByRole("dialog");
      if (await confirmationDialog.isVisible().catch(() => false)) {
        await confirmationDialog.getByRole("button", { name: CONST.SITECORE.LABELS.CONTINUE_BUTTON }).click();
      }
      await page.waitForTimeout(SCENE_PAUSE_MS);
    }, { screenshot: false });

    await step("Tree jump: Ctrl+click opens the target in a new tab", async () => {
      const foblesFrame = await activateFoblesForJumpTest(page, jumpScenario);
      const menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
      const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
      const mousePosition = getLastKnownMousePosition();

      await moveMouseTo(page, menuButton, mousePosition, MOUSE_MOVE_LABEL.MENU_TRIGGER);
      await menuButton.click();
      await page.waitForTimeout(STEP_WAIT_MS);
      await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

      const jumpButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON).nth(1);
      await expect(jumpButton).toBeVisible();
      await moveMouseTo(page, jumpButton, mousePosition, MOUSE_MOVE_LABEL.TREE_JUMP_CTRL_CLICK);

      const newTabPromise = page.context().waitForEvent("page");
      await pulseMouseMarkerClick(page);
      await jumpButton.click({ modifiers: ["Control"] });
      const newTab = await newTabPromise;
      await newTab.waitForLoadState("domcontentloaded").catch(() => undefined);
      await newTab.bringToFront();
      await newTab.waitForTimeout(SCENE_PAUSE_MS);
      await page.bringToFront();
      await newTab.close();
    }, { screenshot: false });
  });
});
