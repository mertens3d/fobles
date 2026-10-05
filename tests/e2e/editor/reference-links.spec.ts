import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import { expectFoblesButtonSameTabNavigation } from "../../helpers/fobles-helpers-support/navigation-assertions";
import { ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { openScLinksGallery } from "../../macros/sitecore-macros";
import { findFoblesFrame } from "../../helpers/frame-finder";
import { EDITOR_SCENARIOS } from "./editor-scenarios";
import { clickLbolt } from "../../macros/fobles-macros";
import { CONST } from "../../CONST";
import { expect, foblesTest } from "../../fixtures/playwright";
import { openSitecorePage } from "../../fixtures/sitecore";
import { pauseForHuman } from "../../helpers/wait-helpers";
import { FOBLES_HIDDEN_CLASS_PATTERN } from "../strategies/support/CONST";

const STEP_WAIT_MS: number = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Reference Links (src/content/features/augmentor/editor-strategies/reference-links.ts) doesn't
// decorate a single field like the strategies/*.spec.ts suite - it decorates Content Editor's own
// "Links" gallery (Navigate ribbon tab), which lists every item referencing the open item plus
// every item the open item refers to in turn. That gallery is loaded into the page after Fobles'
// own initial pass, so Fobles must be toggled on *after* opening it for the augmentor to ever see
// its markup - the reverse of every strategies/*.spec.ts test, which toggles on before locating
// its field.
const SCENARIO = EDITOR_SCENARIOS.REFERENCE_LINKS;

// SCENARIO.referringItems/referredToItem (editor-yml-refs.ts) are a known MINIMUM, not the total -
// someone else's content on the same shared Sitecore instance could reference this same target
// item too, and that's fine; we only assert our own fixture referrers are still present among
// whatever else may also be there, so unrelated content never breaks this test.
function expectedReferenceNotFoundMessage(expectedButtonText: string): string {
  return `Did you forget to update tests/e2e/editor/editor-yml-refs.ts? Expected a Fobles button for: "${expectedButtonText}"`;
}

foblesTest.describe("Editor scenario: reference links", () => {
  foblesTest(
    "toggling Fobles decorates and restores the Links gallery",
    async ({ page }, testInfo) => {
      await openSitecorePage(
        page,
        `${CONST.SITECORE.PATHS.CONTENT_EDITOR_BW_ENCODED}&fo=${SCENARIO.itemId}`,
      );

      const foblesFrame = await findFoblesFrame(page);
      await ensureMouseMarkerExists(foblesFrame);

      const linksPanel = await openScLinksGallery(page, foblesFrame);
      const knownLabels = [
        ...SCENARIO.referringItems.map((item) => item.expectedButtonText),
        SCENARIO.referredToItem.expectedButtonText,
      ];

      const step = createFoblesStep(
        page,
        testInfo,
        linksPanel,
        "Reference Links",
      );

      await step(
        "Default stage: gallery renders as plain Sitecore links",
        async () => {
          await expect(
            linksPanel.locator(CONST.FOBLES.SELECTORS.WRAPPER),
          ).toHaveCount(0);

          for (const expectedButtonText of knownLabels) {
            await expect(
              linksPanel.locator("a.scLink", { hasText: expectedButtonText }),
              expectedReferenceNotFoundMessage(expectedButtonText),
            ).toBeVisible();
          }

          await pauseForHuman(page, STEP_WAIT_MS);
        },
      );

      await step(
        "Toggle Fobles on: every referenced/referring link gets a Fobles button",
        async () => {
          await clickLbolt(page);

          for (const expectedButtonText of knownLabels) {
            await expect(
              linksPanel.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON, { hasText: expectedButtonText }),
              expectedReferenceNotFoundMessage(expectedButtonText),
            ).toBeVisible();
          }

          await pauseForHuman(page, STEP_WAIT_MS);
        },
      );

      const [firstReferringItem] = SCENARIO.referringItems;

      const firstButton = linksPanel.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON, {
        hasText: firstReferringItem.expectedButtonText,
      });

      await step(
        "Toggle Fobles off: the gallery returns to its original shape",
        async () => {
          await clickLbolt(page);

          await expect(
            linksPanel.locator(CONST.FOBLES.SELECTORS.WRAPPER),
          ).toHaveCount(0);

          for (const expectedButtonText of knownLabels) {
            const originalLink = linksPanel.locator("a.scLink", { hasText: expectedButtonText });
            await expect(originalLink, expectedReferenceNotFoundMessage(expectedButtonText)).toBeVisible();
            await expect(originalLink).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
          }
        },
      );

      await clickLbolt(page);

      await step(
        `Click navigates to the referring item: "${firstReferringItem.expectedFoValue}"`,
        async (fullTitle) => {
          await expectFoblesButtonSameTabNavigation(
            page,
            testInfo,
            firstButton,
            firstReferringItem.expectedFoValue,
            fullTitle,
          );
        },
        { screenshot: false },
      );
    },
  );
});
