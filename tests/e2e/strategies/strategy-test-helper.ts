import { CONST } from "../CONST";
import { logStepDividerEnd, logStepDividerStart } from "../helpers/loggingHelper";
import { expect } from "../fixtures/playwright";
import { expectFoblesButtonNewTabNavigation, expectFoblesButtonSameTabNavigation } from "../fobles-helpers";
import { clickLbolt } from "../macros/fobles-macros";
import { clickWithMouseMarker, ensureMouseMarkerExists, highlightLocator } from "../mouse-proxy";
import { fieldScreenshotName, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import type { StrategyTestContext } from "./scenario.types";
import { LogDebugTestContext } from "../helpers/debugHelper";
import { findFoblesFrame } from "../frame-finder";
import { factoryStrategyTestContext } from "../strategy-test-context";
import { showBillboard } from "../billboard";


export async function stepExpectFoblesInitialConditions(testContext: StrategyTestContext) {
  await testContext.step("Initial Fobles conditions", async () => {
    logStepDividerStart(stepExpectFoblesInitialConditions.name);

    // console.log(`[fobles] Looking for the LBolt button in a frame`);
    const foblesFrame = await findFoblesFrame(testContext.page);
    // console.log(`[fobles] LBolt button frame found`);

    await ensureMouseMarkerExists(foblesFrame);

    const fieldTable = await testContext.getFieldTable();
    await expect(fieldTable).toBeVisible();
    if (!fieldTable.isVisible()) {
      console.error(`[fobles] Field table is not visible`);
      throw new Error(`[fobles] Field table is not visible`);
    }

    await expect(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "DEFAULT"));
    await testContext.page.waitForTimeout(testContext.STEP_WAIT_MS);

    logStepDividerEnd(stepExpectFoblesInitialConditions.name);
  });
}


export async function stepExpectSitecoreInitialConditions(testContext: StrategyTestContext) {

  await testContext.step("Initial Sitecore Conditions",
    async () => {

      logStepDividerStart(stepExpectSitecoreInitialConditions.name);

      await showBillboard(testContext.page, stepExpectSitecoreInitialConditions.name, { xPercent: 50, yPercent: 50 });
      const fieldTable = await testContext.getFieldTable();
      await highlightLocator(fieldTable, "fieldTable");
      await expect(fieldTable).toBeVisible();
      if (!fieldTable.isVisible()) {
        console.error(`[fobles] Field table is not visible`);
        throw new Error(`[fobles] Field table is not visible`);
      }


      const locatorFirstResult = await testContext.getScLocatorFirstResult();
      await highlightLocator(locatorFirstResult, "locatorFirstResult");
      await expect(locatorFirstResult).toBeVisible();
      if (!locatorFirstResult.isVisible()) {
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
      await highlightLocator(fieldTable, "fieldTable");

      const locatorFirstResult = await testContext.getScLocatorFirstResult();
      await highlightLocator(locatorFirstResult, "locatorFirstResult");

      await clickLbolt(testContext.page);
      await expect(locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(testContext.SCENARIO.expectedButtonText);
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "FOBLES_ON"));
      await testContext.page.waitForTimeout(testContext.STEP_WAIT_MS);
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
      const foblesButton = fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();

      console.log(`about to ctrl+click`);
      await clickWithMouseMarker(
        testContext.page,
        foblesButton,
        "Fobles item button",
        { modifiers: ["Control"] },
      );

      const popup = await popupPromise;
      console.log(`Popup URL: ${popup.url()}`);

      await expectFoblesButtonNewTabNavigation(testContext, fullTitle, popup);
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
    await highlightLocator(locatorFirstResult, "locatorFirstResult");
    await expect(locatorFirstResult).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
    await expect(locatorFirstResult).not.toHaveAttribute(CONST.FOBLES.ATTRIBUTES.PROCESSED, "1");

    const fieldTable = await testContext.getFieldTable();
    await highlightLocator(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER), "wrapper");
    await expect(fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);

    await testContext.page.waitForTimeout(testContext.STEP_WAIT_MS);
    logStepDividerEnd(stepExpectFoblesOffConditions.name);
  });
}

export async function stepExpectFoblesClick(testContext: StrategyTestContext) {
  await clickLbolt(testContext.page);

  await testContext.step(
    `Click navigates to the target item: "${testContext.SCENARIO.expectedFoValue}"`,
    async (fullTitle) => {
      const foblesButton = (await testContext.getFieldTable()).locator(CONST.FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonSameTabNavigation(testContext.page, testContext.testInfo, foblesButton, testContext.SCENARIO.expectedFoValue, fullTitle);
    },
    { screenshot: false },
  );
}