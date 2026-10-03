
import { CONST } from "../../CONST";
import { openContentEditor } from "../../fixtures/sitecore";
import { clickJumpFlyoutUrlButton } from "../../macros/fobles-macros";
import { foblesTest, type Page, type TestInfo } from "../../fixtures/playwright";
import { clickFoblesNavigationButton as clickTestFoblesNavigationButton } from "../../helpers/click-navigate-helpers";
import type { PageJumpDefinition } from "../../constants/CONST.Types";
import { isAIPage } from "../../helpers/path-helpers";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import { setupContentEditorForTestingBasic } from "../../helpers/fobles-helpers-support/test-setup";


foblesTest.describe("Navigation", () => {

    for (const pageJumpTarget of CONST.TESTING.PAGE_JUMP_TARGETS) {

        foblesTest(pageJumpTarget.label, async ({
            page,
        }, testInfo) => {
            foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
            await setupContentEditorForTestingBasic(page);

            if (isAIPage(page) && pageJumpTarget.skipTestingAI) {
                console.log(`[fobles] Skipping jump flyout target "${pageJumpTarget.label}" - known environment URL drift`);
                foblesTest.skip();
            }

            const step = createStep(page, testInfo, page, pageJumpTarget.label);

            await step(
                `Click "${pageJumpTarget.label}": URL contains "${pageJumpTarget.url}"`,
                async () => {
                    await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
                    const jumpFlyoutButton = await clickJumpFlyoutUrlButton(page, pageJumpTarget.url);
                    await clickTestFoblesNavigationButton(page, jumpFlyoutButton, pageJumpTarget.url, testInfo);
                },
                { timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS }
            );


        });
    }
});


