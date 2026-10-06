
import { CONST } from "../../CONST";
import { openContentEditor } from "../../fixtures/sitecore";
import { getPageJumpFlyoutButton } from "../../helpers/element-finders";
import { foblesTest, type Locator } from "../../fixtures/playwright";
import { clickFoblesNavigationButtonStep, ctrlClickFoblesNavigationButton } from "../../helpers/click-navigate-helpers";
import { getLastTwoPathItems, isAIPage } from "../../helpers/path-helpers";
import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import { setupContentEditorForTestingBasic } from "../../helpers/fobles-helpers-support/test-setup";
import { attachLocatorScreenshot } from "../../helpers/fobles-helpers-support/screenshots";


foblesTest.describe("Tree Navigation", () => {

    for (const pageJumpTarget of CONST.TESTING.PAGE_JUMP_TARGETS) {

        foblesTest(pageJumpTarget.label, async ({
            page, sharedBrowserContext
        }, testInfo) => {
            foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
            await setupContentEditorForTestingBasic(page);

            if (isAIPage(page) && pageJumpTarget.skipTestingAI) {
                console.log(`[fobles] Skipping jump flyout target "${pageJumpTarget.label}" - known environment URL drift`);
                foblesTest.skip();
            }

            const step = createFoblesStep(page, testInfo, page, pageJumpTarget.label);
            let jumpFlyoutButton: Locator | undefined;

            await step(
                `Ctrl+Click "${pageJumpTarget.clickNavigationExpect.foValue}"`,

                async (fullTitle) => {
                    if (pageJumpTarget.clickNavigationExpect?.foValue) {
                        await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
                        jumpFlyoutButton = await getPageJumpFlyoutButton(page, pageJumpTarget.clickNavigationExpect.foValue);
                        await attachLocatorScreenshot(testInfo, jumpFlyoutButton, `fobles-navigation-button-${getLastTwoPathItems(pageJumpTarget.clickNavigationExpect.foValue)}.png`);
                        if (jumpFlyoutButton) {
                            await ctrlClickFoblesNavigationButton(page, jumpFlyoutButton, pageJumpTarget.clickNavigationExpect.foValue, testInfo, sharedBrowserContext, fullTitle);
                        }
                    } else {
                        throw new Error(`Expected foValue not found for page jump target: ${pageJumpTarget.label}`);
                    }
                },
                {
                    timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS,
                    screenshot: false
                }
            );

            await step(
                `Click"${pageJumpTarget.clickNavigationExpect.foValue}"`,
                async () => {
                    if (pageJumpTarget.clickNavigationExpect.foValue) {

                        await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
                        jumpFlyoutButton = await getPageJumpFlyoutButton(page, pageJumpTarget.clickNavigationExpect.foValue);
                        await attachLocatorScreenshot(testInfo, jumpFlyoutButton, `fobles-navigation-button-${getLastTwoPathItems(pageJumpTarget.clickNavigationExpect.foValue)}.png`);
                        if (jumpFlyoutButton) {
                            await clickFoblesNavigationButtonStep(page, jumpFlyoutButton, testInfo, pageJumpTarget.clickNavigationExpect, pageJumpTarget.label);
                        }
                    } else {
                        throw new Error(`Expected foValue not found for page jump target: ${pageJumpTarget.label}`);
                    }
                },
                {
                    timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS,
                    screenshot: true
                }
            );



        });
    }
});


