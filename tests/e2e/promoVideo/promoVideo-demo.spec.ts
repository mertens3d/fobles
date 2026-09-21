import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  activateFoblesForJumpTest,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton, dragToolbarTo, findFrameWithSelector } from "../sitecore-macros";
import { moveMouseTo, pulseMouseMarkerClick, showMouseMarker } from "../mouse-proxy";
import { FOBLES } from "../strategies/CONST";
import { STRATEGY_SCENARIOS } from "../strategies/strategy-scenarios";
import { EDITOR_SCENARIOS } from "../editor/editor-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// A single, deliberately short walkthrough for recording a store-listing promo video (not part of
// the normal regression suite's assertions-first style) - runs through a couple of field
// strategies, the Quick Info panel, a tree-jump click and Ctrl+click, and dragging the toolbar
// around. Run with `npm run test:e2e:promoVideo` (playwright.config.ts turns video recording on
// for anything under tests/e2e/promoVideo, since the normal suite only keeps failure videos).
// Target runtime: under 1:45 - trim clips in an editor afterward rather than padding this script out.
test.describe("Promo: short feature walkthrough", () => {
  test("field strategies, Quick Info, tree jumps, and toolbar drag", async ({ page }, testInfo) => {
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
      await page.waitForTimeout(STEP_WAIT_MS);
    });

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
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    const quickInfo = EDITOR_SCENARIOS.QUICK_INFO_SECTION;
    await step("Quick Info: toggling Fobles decorates the panel", async () => {
      await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${quickInfo.itemId}`);
      await showMouseMarker(page);

      const foblesFrame = await findFrameWithSelector(
        page,
        CONST.SITECORE.SELECTORS.LBOLT_BUTTON,
        "LBolt button",
      );
      await showMouseMarker(foblesFrame);
      const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
      await clickLboltButton(page, lboltButton);

      const quickInfoTable = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE).first();
      await expect(quickInfoTable.locator(FOBLES.SELECTORS.WRAPPER).first()).toBeVisible();
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    const jumpScenario = CONST.SCENARIOS[0];
    await step("Tree jump: plain click navigates in the current tab", async () => {
      const foblesFrame = await activateFoblesForJumpTest(page, jumpScenario);
      const menuButton = foblesFrame.locator(".fobles-quick-menu-trigger").first();
      const menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
      const mousePosition = { x: 0, y: 0 };

      await moveMouseTo(page, menuButton, mousePosition, "Quick menu trigger");
      await menuButton.click();
      await page.waitForTimeout(STEP_WAIT_MS);
      await expect(menuFlyout).toHaveAttribute("data-visible", "true");

      const jumpButton = foblesFrame.locator("[data-fobles-tree-jump-path]").first();
      await expect(jumpButton).toBeVisible();
      await moveMouseTo(page, jumpButton, mousePosition, "Tree jump");
      await pulseMouseMarkerClick(page);
      await jumpButton.click();

      const confirmationDialog = foblesFrame.getByRole("dialog");
      if (await confirmationDialog.isVisible().catch(() => false)) {
        await confirmationDialog.getByRole("button", { name: "Continue" }).click();
      }
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Tree jump: Ctrl+click opens the target in a new tab", async () => {
      const foblesFrame = await activateFoblesForJumpTest(page, jumpScenario);
      const menuButton = foblesFrame.locator(".fobles-quick-menu-trigger").first();
      const menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
      const mousePosition = { x: 0, y: 0 };

      await moveMouseTo(page, menuButton, mousePosition, "Quick menu trigger");
      await menuButton.click();
      await page.waitForTimeout(STEP_WAIT_MS);
      await expect(menuFlyout).toHaveAttribute("data-visible", "true");

      const jumpButton = foblesFrame.locator("[data-fobles-tree-jump-path]").nth(1);
      await expect(jumpButton).toBeVisible();
      await moveMouseTo(page, jumpButton, mousePosition, "Tree jump (Ctrl+click)");

      const newTabPromise = page.context().waitForEvent("page");
      await pulseMouseMarkerClick(page);
      await jumpButton.click({ modifiers: ["Control"] });
      const newTab = await newTabPromise;
      await newTab.waitForLoadState("domcontentloaded").catch(() => undefined);
      await newTab.bringToFront();
      await newTab.waitForTimeout(STEP_WAIT_MS);
      await page.bringToFront();
      await newTab.close();
    });

    await step("Toolbar drag: repositioning to another corner", async () => {
      const foblesFrame = await findFrameWithSelector(
        page,
        CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER,
        "Fobles toolbar",
      );
      const grip = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_GRIP).first();
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await dragToolbarTo(page, grip, { x: 80, y: viewport.height - 80 });
      await page.waitForTimeout(STEP_WAIT_MS);
    });
  });
});
