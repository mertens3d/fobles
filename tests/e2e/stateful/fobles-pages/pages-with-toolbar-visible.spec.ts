// @source-path [Fobles] tests/e2e/stateful/fobles-pages/pages-with-toolbar-visible.spec.ts

import { expect, foblesTest, type Page, type TestInfo } from "../../../fixtures/playwright";
import { openSitecorePage } from "../../../fixtures/sitecore";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import {
  attachUiPathNote,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../../../helpers/fobles-helpers-support/navigation-assertions";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "../../../helpers/mouse-proxy";
import { findFoblesFrame, findFrameWithSelector } from "../../../helpers/frame-finder";
import { expectNeverAppears, pauseForHuman } from "../../../helpers/wait-helpers";
import { clickLbolt } from "../../../macros/fobles-macros";
import type { PageCase, ToolbarType } from "../../../constants_partials/CONST.Types";
import { toBracedGuid } from "../../../helpers/guid-helpers";
import type { FoblesStep } from "../../../helpers/fobles-test-step.types";
import { locateJumpFlyoutTrigger, locateLBoltButton } from "../../../helpers/locator-helpers";
import { expectFoblesContainerVisible } from "../../../expect-snippets/expect-snippets";

const STEP_WAIT_MS = TEST_CONST.TESTING.SPEED.SETTINGS[TEST_CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

async function assertToolbarFlavor(foblesFrame: Awaited<ReturnType<typeof findFrameWithSelector>>, toolbarType: ToolbarType, page: Page) {
  // const jumpFlyoutTrigger = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER);

  const jumpFlyoutTrigger = await locateJumpFlyoutTrigger(page);
  const proxyButtonsTrigger = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.PROXY_BUTTONS_TRIGGER);
  const closeButton = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CLOSE_BUTTON);

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
  for (const pageCase of TEST_CONST.TESTING.FOBLES_PAGES) {
    // const runTest = pageCase.skip
    //   ? foblesTest.skip.bind(foblesTest)
    //   : foblesTest.bind(foblesTest);

    if (pageCase.skip) {
      foblesTest.skip(`${pageCase.label} is skipped`, () => { });
    } else {
      foblesTest(pageCase.label, async ({ page, sharedBrowserContext }, testInfo) => {
        await stepVisibility(page, testInfo, pageCase);
      });
    }
  }
});

async function stepVisibility(page: Page, testInfo: TestInfo, pageCase: PageCase) {
  const step = createFoblesStep(page, testInfo, page, "Pages");

  await step(
    `${pageCase.label}: Fobles nav ${pageCase.foblesEligible ? "appears" : "does not appear"}`,
    async (fullTitle) => {
      await attachUiPathNote(testInfo, pageCase.uiPath, fullTitle);
      await openSitecorePage(page, pageCase.encodedPath);

      if (!pageCase.foblesEligible) {
        await expectNeverAppears(
          page.locator(TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER),
          2000,
          `Fobles toolbar appeared on ${pageCase.label}, which is supposed to be ineligible`,
        );
        return;
      } else {
        await expectFoblesContainerVisible(page);
        const foblesFrame = await findFoblesFrame(page);
        await ensureMouseMarkerExists(foblesFrame);
        await expectFoblesContainerVisible(page);
        const lboltButton = await locateLBoltButton(page);
        await expect(lboltButton).toBeVisible();
        await assertToolbarFlavor(foblesFrame, pageCase.toolbarType, page);
      }
    },
  );
  return step;
}

