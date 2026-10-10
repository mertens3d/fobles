import { expect, foblesTest, type Locator } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage, setFoblesNavWarningVisible } from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import { clickWithMouseMarker } from "../../../helpers/mouse-proxy";
import { openContentEditor } from "../../../fixtures/sitecore";
import { findFoblesFrame } from "../../../helpers/frame-finder";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import { attachLocatorScreenshot } from "../../../helpers/fobles-helpers-support/screenshots";
import { attachItemPathScreenshot } from "../../../helpers/fobles-helpers-support/navigation-assertions";
import { ClickFoblesJumpButton } from "../../../macros/fobles-macros";
import { pauseForHuman } from "../../../helpers/wait-helpers";
import { bringPageToFront } from "../../../helpers/page-switch";
import {
  addTestRow,
  removeTestRowIfPresent,
  setTestRowEnabled,
} from "../../toolbar/support/extension-options-settings-helpers";
import { expectCurrentUrlContains, expectFoValue } from "../../../expect-snippets/expect-snippets";

foblesTest.describe("User Tree Jumps", () => {
  foblesTest.describe("Toolbar Integration", () => {
    foblesTest(
      "toolbar renders, live-updates, hides, and navigates a User Tree Jump",
      async ({ sharedBrowserContext, page }, testInfo) => {
        foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
        const extensionId = await getExtensionId(sharedBrowserContext);
        const optionsPage = await openExtensionPage(
          sharedBrowserContext,
          extensionId,
          "options",
        );
        const step = createFoblesStep(page, testInfo, page, "User Tree Jump");

        try {
          // Other suites sharing this persistent browser profile may have left the warning off.
          await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
          await removeTestRowIfPresent(optionsPage);
          await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
          const foblesFrame = await findFoblesFrame(page);

          await ClickFoblesJumpButton(page);
          await pauseForHuman(page);

          await step("does not render with an empty list", async () => {
            await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(
              0,
            );
          });

          let row!: Locator;
          await step(
            "appears live after saving, without a page refresh",
            async () => {
              row = await addTestRow(optionsPage);
              await bringPageToFront(page);
              await expect(
                foblesFrame.getByText("User Tree Jumps"),
              ).toBeVisible();
              await expect(
                foblesFrame.getByRole("button", {
                  name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
                }),
              ).toBeVisible();
            },
          );

          await step("hides live again once disabled", async () => {
            await setTestRowEnabled(optionsPage, row, false);
            await bringPageToFront(page);
            await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(
              0,
            );
          });

          await step(
            `re-enabled entry navigates to "${CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH}"`,
            async (fullTitle) => {
              await setTestRowEnabled(optionsPage, row, true);
              await bringPageToFront(page);
              const jumpButton = foblesFrame.getByRole("button", {
                name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
              });
              await expect(jumpButton).toBeVisible();
              await expect(jumpButton).toHaveAttribute(
                CONST.FOBLES.ATTRIBUTES.TREE_JUMP_PATH,
                CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH,
              );
              await pauseForHuman(page);
              await jumpButton.scrollIntoViewIfNeeded();
              await attachLocatorScreenshot(
                testInfo,
                foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT),
                CONST.TESTING.REPORT_SCREENSHOTS.USER_TREE_JUMP_FLYOUT,
              );
              await clickWithMouseMarker(
                page,
                jumpButton,
                CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
              );

              const confirmationDialog = foblesFrame.getByRole("dialog");
              await expect(confirmationDialog).toBeVisible();
              await pauseForHuman(page);
              await Promise.all([
                page.waitForURL(
                  (url) =>
                    url
                      .toString()
                      .includes(
                        
                          CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH,
                        
                      ),
                  {
                    timeout: CONST.TESTING.TIMEOUTS.URL_WAIT_MS,
                  },
                ),
                pauseForHuman(page),
                clickWithMouseMarker(
                  page,
                  confirmationDialog.getByRole("button", {
                    name: CONST.FOBLES.LABELS.CONTINUE_BUTTON,
                  }),
                  "Confirm dialog Continue",
                ),
                pauseForHuman(page),
              ]);

              expectFoValue(page, CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH);
              await attachItemPathScreenshot(page, testInfo, fullTitle);
            },
            { screenshot: false },
          );
        } finally {
          await removeTestRowIfPresent(optionsPage);
          await optionsPage.close();
        }
      },
    );
  });
});
