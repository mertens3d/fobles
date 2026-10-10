import { CONST } from "../../../CONST";
import { expectFoblesButtonNewTabNavigationStrategy, expectFoblesButtonSameTabNavigation } from "../../../helpers/fobles-helpers-support/navigation-assertions";
import { clickLbolt } from "../../../macros/fobles-macros";
import { clickWithMouseMarker, ensureMouseMarkerExists, highlightClickTarget } from "../../../helpers/mouse-proxy";
import { fieldScreenshotName, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import type { StrategyTestContext } from "./scenario.types";
import { findFoblesFrame } from "../../../helpers/frame-finder";
import { showBillboard } from "../../../helpers/billboard";
import { logStepDividerEnd, logStepDividerStart } from "../../../helpers/logging-helpers";
import { expect } from "@playwright/test";
import { LogDebugTestContext } from "../../../helpers/debug-helpers";
import { pauseForHuman } from "../../../helpers/wait-helpers";

export async function stepExpectFoblesInitialConditions(testContext: StrategyTestContext) {
  await testContext.step("Initial Fobles conditions", async () => {
    logStepDividerStart(stepExpectFoblesInitialConditions.name);

    // console.log(`[fobles] Looking for the LBolt button in a frame`);
    const foblesFrame = await findFoblesFrame(testContext.page);
    // console.log(`[fobles] LBolt button frame found`);

    await ensureMouseMarkerExists(foblesFrame);

    const fieldTable = await testContext.getFieldTable();
    await expect(fieldTable).toBeVisible();
    if (! await fieldTable.isVisible()) {
      console.error(`[fobles] Field table is not visible`);
      throw new Error(`[fobles] Field table is not visible`);
    }

    await expect(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "DEFAULT"));

    await pauseForHuman(testContext.page, testContext.STEP_WAIT_MS);

    logStepDividerEnd(stepExpectFoblesInitialConditions.name);
  });
}

export async function stepExpectSitecoreInitialConditions(testContext: StrategyTestContext) {

  await testContext.step("Initial Sitecore Conditions",
    async () => {

      logStepDividerStart(stepExpectSitecoreInitialConditions.name);

      await showBillboard(testContext.page, stepExpectSitecoreInitialConditions.name);
      const fieldTable = await testContext.getFieldTable();
      await highlightClickTarget(fieldTable, "fieldTable");
      await expect(fieldTable).toBeVisible();
      if (! await fieldTable.isVisible()) {
        console.error(`[fobles] Field table is not visible`);
        throw new Error(`[fobles] Field table is not visible`);
      }

      const locatorFirstResult = await testContext.getScLocatorFirstResult();
      await highlightClickTarget(locatorFirstResult, "locatorFirstResult");
      await expect(locatorFirstResult).toBeVisible();
      if (! await locatorFirstResult.isVisible()) {
        console.error(`[fobles] Locator first result is not visible`);
        throw new Error(`[fobles] Locator first result is not visible`);
      }

      logStepDividerEnd(stepExpectSitecoreInitialConditions.name);
    });

}

export async function stepExpectFoblesOnConditions(testContext: StrategyTestContext) {
  await testContext.step("Toggle Fobles on: the field gets a Fobles button",
    async () => {
      logStepDividerStart(stepExpectFoblesOnConditions.name);
      const fieldTable = await testContext.getFieldTable();
      await highlightClickTarget(fieldTable, "fieldTable");

      const locatorFirstResult = await testContext.getScLocatorFirstResult();
      await highlightClickTarget(locatorFirstResult, "locatorFirstResult");

      await clickLbolt(testContext.page);
      await expect(locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(testContext.SCENARIO.foblesButtonSelector ?? CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(testContext.SCENARIO.expectedButtonText);
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "FOBLES_ON"));
      await pauseForHuman(testContext.page, testContext.STEP_WAIT_MS);
      await LogDebugTestContext(testContext);
      logStepDividerEnd(stepExpectFoblesOnConditions.name);
    });

}

export async function stepExpectFoblesCtrlClick(testContext: StrategyTestContext) {
  await testContext.step(
    `Ctrl+click: opens the target item in a new tab: "${testContext.SCENARIO.expectedFoValue}"`,
    async (fullTitle) => {
      logStepDividerStart(stepExpectFoblesCtrlClick.name);

      await LogDebugTestContext(testContext);

      const popupPromise = testContext.page.context().waitForEvent("page");

      const fieldTable = await testContext.getFieldTable();
      const foblesButton = fieldTable.locator(testContext.SCENARIO.foblesButtonSelector ?? CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON).first();

      console.log(`about to ctrl+click`);
      await clickWithMouseMarker(
        testContext.page,
        foblesButton,
        "Fobles item button",
        { modifiers: ["Control"] },
      );

      const popup = await popupPromise;
      console.log(`Popup URL: ${popup.url()}`);

      await expectFoblesButtonNewTabNavigationStrategy(testContext, fullTitle, popup);
      logStepDividerEnd(stepExpectFoblesCtrlClick.name);
    },
    { screenshot: false },
  );
}

export async function stepExpectFoblesOffConditions(testContext: StrategyTestContext) {
  await testContext.step("Toggle Fobles off: the field returns to its original shape", async () => {

    logStepDividerStart(stepExpectFoblesOffConditions.name);

    await clickLbolt(testContext.page);

    const locatorFirstResult = await testContext.getScLocatorFirstResult();
    await highlightClickTarget(locatorFirstResult, "locatorFirstResult");
    await expect(locatorFirstResult).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
    await expect(locatorFirstResult).not.toHaveAttribute(CONST.FOBLES.ATTRIBUTES.PROCESSED, "1");

    const fieldTable = await testContext.getFieldTable();
    await highlightClickTarget(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER), "wrapper");
    await expect(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);

    await pauseForHuman(testContext.page, testContext.STEP_WAIT_MS);

    logStepDividerEnd(stepExpectFoblesOffConditions.name);
  });
}

export async function stepExpectFoblesClick(testContext: StrategyTestContext) {
  await clickLbolt(testContext.page);

  await testContext.step(
    `Click navigates to the target item: "${testContext.SCENARIO.expectedFoValue}"`,
    async (fullTitle) => {
      const foblesButton = (await testContext.getFieldTable()).locator(testContext.SCENARIO.foblesButtonSelector ?? CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON).first();
      await expectFoblesButtonSameTabNavigation(testContext.page, testContext.testInfo, foblesButton, testContext.SCENARIO.expectedFoValue, fullTitle);
    },
    { screenshot: false },
  );
}