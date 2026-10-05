import { expect, foblesTest } from "../../fixtures/playwright";
import { openSitecorePage } from "../../fixtures/sitecore";
import { CONST } from "../../CONST";
import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import {
  attachUiPathNote,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../../helpers/fobles-helpers-support/navigation-assertions";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { findFrameWithSelector } from "../../helpers/frame-finder";
import { expectNeverAppears, pauseForHuman } from "../../helpers/wait-helpers";
import { clickLbolt } from "../../macros/fobles-macros";
import type { ToolbarType } from "../../constants_partials/CONST.Types";
import { toBracedGuid } from "../../helpers/guid-helpers";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

function assertToolbarFlavor(foblesFrame: Awaited<ReturnType<typeof findFrameWithSelector>>, toolbarType: ToolbarType) {
  const jumpFlyoutTrigger = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER);
  const proxyButtonsTrigger = foblesFrame.locator(CONST.FOBLES.SELECTORS.PROXY_BUTTONS_TRIGGER);
  const closeButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CLOSE_BUTTON);

  if (toolbarType === "compact") {
    return Promise.all([
      expect(jumpFlyoutTrigger).toHaveCount(0),
      expect(proxyButtonsTrigger).toHaveCount(0),
      expect(closeButton).toHaveCount(0),
    ]);
  }

  return Promise.all([
    expect(jumpFlyoutTrigger).toBeVisible(),
    expect(proxyButtonsTrigger).toBeVisible(),
    expect(closeButton).toBeVisible(),
  ]);
}

foblesTest.describe("Pages: toolbar visibility, Fobles activation, and button navigation", () => {
  for (const pageCase  of CONST.TESTING.FOBLES_PAGES){
    const runTest = pageCase.skip ? foblesTest.skip.bind(foblesTest) : foblesTest.bind(foblesTest);

    runTest(`${pageCase.label}: Fobles nav ${pageCase.foblesEligible ? "appears" : "does not appear"}`, async ({ page }, testInfo) => {
      const step = createFoblesStep(page, testInfo, page, "Pages");

      await step(`${pageCase.label}: Fobles nav ${pageCase.foblesEligible ? "appears" : "does not appear"}`, async (fullTitle) => {
        await attachUiPathNote(testInfo, pageCase.uiPath, fullTitle);
        await openSitecorePage(page, pageCase.encodedPath);

        if (!pageCase.foblesEligible) {
          await expectNeverAppears(
            page.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER),
            2_000,
            `Fobles toolbar appeared on ${pageCase.label}, which is supposed to be ineligible`,
          );
          return;
        }

        const foblesFrame = await findFrameWithSelector(
          page,
          CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER,
          `Fobles toolbar on ${pageCase.label}`,
          10_000,
        );
        await ensureMouseMarkerExists(foblesFrame);

        await expect(foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER)).toBeVisible();
        await expect(foblesFrame.locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON)).toBeVisible();
        await assertToolbarFlavor(foblesFrame, pageCase.toolbarType);
      });

      if (!pageCase.foblesEligible) return;

      // createStep auto-attaches a screenshot per step (pass or fail) - the step above captured
      // the default Sitecore view (toolbar present, Fobles not yet activated); this one captures
      // the same page with Fobles enabled, for every eligible page regardless of whether a
      // guaranteed item exists for deeper activation/navigation checks below.
      await step(`${pageCase.label}: Fobles enabled`, async () => {
        await clickLbolt(page);
        await pauseForHuman(page, STEP_WAIT_MS);
      });

      if (!pageCase.knownItemId) {
        if (pageCase.activationGap) {
          console.log(`[fobles] ${pageCase.label}: activation/navigation not yet tested - ${pageCase.activationGap}`);
        }
        return;
      }

      const knownItemId = pageCase.knownItemId;
      const treeButtonSelector = `${CONST.FOBLES.SELECTORS.TREE_FOBLES_BUTTON}[data-fobles-item-id="${knownItemId.replace(/-/g, "")}" i]`;

      await step(`${pageCase.label}: activating Fobles decorates the known item with a button`, async () => {
        const treeFrame = await findFrameWithSelector(
          page,
          treeButtonSelector,
          `Fobles tree button on ${pageCase.label}`,
          10_000,
        );
        await expect(treeFrame.locator(treeButtonSelector)).toBeVisible();
      });

      await step(
        `${pageCase.label}: Ctrl+click opens the known item in a new tab`,
        async (fullTitle) => {
          const treeFrame = await findFrameWithSelector(
            page,
            treeButtonSelector,
            `Fobles tree button on ${pageCase.label}`,
            10_000,
          );
          const button = treeFrame.locator(treeButtonSelector);
          const popupPromise = page.context().waitForEvent("page");
          await clickWithMouseMarker(page, button, "Fobles item button", { modifiers: ["Control"] });
          const popup = await popupPromise;
          await expectFoblesButtonNewTabNavigation(testInfo, toBracedGuid(knownItemId), fullTitle, popup, page);
        },
        { screenshot: false },
      );

      await step(
        `${pageCase.label}: click navigates to the known item in the same tab`,
        async (fullTitle) => {
          const treeFrame = await findFrameWithSelector(
            page,
            treeButtonSelector,
            `Fobles tree button on ${pageCase.label}`,
            10_000,
          );
          const button = treeFrame.locator(treeButtonSelector);
          await expectFoblesButtonSameTabNavigation(page, testInfo, button, toBracedGuid(knownItemId), fullTitle);
        },
        { screenshot: false },
      );
    });
  }
});
