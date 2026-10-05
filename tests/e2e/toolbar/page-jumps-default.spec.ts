
import { CONST } from "../../CONST";
import { openContentEditor } from "../../fixtures/sitecore";
import { getClickJumpFlyoutUrlButton } from "../../macros/fobles-macros";
import { foblesTest, type Locator, type Page, type TestInfo } from "../../fixtures/playwright";
import { clickFoblesNavigationButtonStep, ctrlClickFoblesNavigationButton } from "../../helpers/click-navigate-helpers";
import { getLastTwoPathItems, isAIPage } from "../../helpers/path-helpers";
import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import { setupContentEditorForTestingBasic } from "../../helpers/fobles-helpers-support/test-setup";
import { attachLocatorScreenshot } from "../../helpers/fobles-helpers-support/screenshots";


foblesTest.describe("Navigation", () => {

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
                `Ctrl+Click "${pageJumpTarget.url}"`,
                async (fullTitle) => {
                    await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
                    jumpFlyoutButton = await getClickJumpFlyoutUrlButton(page, pageJumpTarget.url);
                    await attachLocatorScreenshot(testInfo, jumpFlyoutButton, `fobles-navigation-button-${getLastTwoPathItems(pageJumpTarget.url)}.png`);
                    if (jumpFlyoutButton) {
                        await ctrlClickFoblesNavigationButton(page, jumpFlyoutButton, pageJumpTarget.url, testInfo, sharedBrowserContext, fullTitle);
                    }
                },
                {
                    timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS,
                    screenshot: false
                }
            );

            await step(
                `Click"${pageJumpTarget.url}"`,
                async () => {
                    await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
                    jumpFlyoutButton = await getClickJumpFlyoutUrlButton(page, pageJumpTarget.url);
                    await attachLocatorScreenshot(testInfo, jumpFlyoutButton, `fobles-navigation-button-${getLastTwoPathItems(pageJumpTarget.url)}.png`);
                    if (jumpFlyoutButton) {
                        await clickFoblesNavigationButtonStep(page, jumpFlyoutButton, pageJumpTarget.url, testInfo);
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


