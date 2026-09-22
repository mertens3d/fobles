import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import {
  createStep,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../fobles-helpers";
import { showMouseMarker } from "../mouse-proxy";
import { clickLboltButton, findFoblesFrame, openLinksGallery } from "../sitecore-macros";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { EDITOR_SCENARIOS } from "./editor-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Reference Links (src/content/features/augmentor/editor-strategies/reference-links.ts) doesn't
// decorate a single field like the strategies/*.spec.ts suite - it decorates Content Editor's own
// "Links" gallery (Navigate ribbon tab), which lists every item referencing the open item plus
// every item the open item refers to in turn. That gallery is loaded into the page after Fobles'
// own initial pass, so Fobles must be toggled on *after* opening it for the augmentor to ever see
// its markup - the reverse of every strategies/*.spec.ts test, which toggles on before locating
// its field.
const SCENARIO = EDITOR_SCENARIOS.REFERENCE_LINKS;

test.describe("Editor scenario: reference links", () => {
  test("toggling Fobles decorates and restores the Links gallery", async ({ page }, testInfo) => {
    await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${SCENARIO.itemId}`);
    await showMouseMarker(page);

    const foblesFrame = await findFoblesFrame(page);
    await showMouseMarker(foblesFrame);

    const linksPanel = await openLinksGallery(page, foblesFrame);

    const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
    const step = createStep(page, testInfo, linksPanel, "Reference Links");

    await step("Default stage: gallery renders as plain Sitecore links", async () => {
      await expect(linksPanel.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: every referenced/referring link gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(linksPanel.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(
        SCENARIO.referringItems.length + 1,
      );
      for (const referringItem of SCENARIO.referringItems) {
        await expect(
          linksPanel.locator(FOBLES.SELECTORS.BUTTON, { hasText: referringItem.expectedButtonText }),
        ).toHaveText(referringItem.expectedButtonText);
      }
      await expect(
        linksPanel.locator(FOBLES.SELECTORS.BUTTON, {
          hasText: SCENARIO.referredToItem.expectedButtonText,
        }),
      ).toHaveText(SCENARIO.referredToItem.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    const [firstReferringItem] = SCENARIO.referringItems;
    const firstButton = linksPanel.locator(FOBLES.SELECTORS.BUTTON, {
      hasText: firstReferringItem.expectedButtonText,
    });

    await step(
      `Ctrl+click: opens the referring item in a new tab: "${firstReferringItem.expectedFoValue}"`,
      async (fullTitle) => {
        await expectFoblesButtonNewTabNavigation(page, testInfo, firstButton, firstReferringItem.expectedFoValue, fullTitle);
      },
      { screenshot: false },
    );

    await step("Toggle Fobles off: the gallery returns to its original shape", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(linksPanel.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(linksPanel.locator("a.scLink").first()).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
    });

    // Toggle back on to reveal the button again for the click test below - no screenshot needed,
    // already captured above.
    await clickLboltButton(page, lboltButton);

    await step(
      `Click navigates to the referring item: "${firstReferringItem.expectedFoValue}"`,
      async (fullTitle) => {
        await expectFoblesButtonSameTabNavigation(page, testInfo, firstButton, firstReferringItem.expectedFoValue, fullTitle);
      },
      { screenshot: false },
    );
  });
});
