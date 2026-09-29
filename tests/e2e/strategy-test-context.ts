
// Shared by every field-strategy test (strategies/*.spec.ts) - navigates to the scenario item,
// shows the mouse marker (matching the toolbar suite's visual style), and locates the field's
import { expect, test, type Frame, type Locator, type Page } from "./fixtures/playwright";
import { openContentEditor, openSitecorePage } from "./fixtures/sitecore";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { CONST } from "./CONST";
import { clickContentTabIfPresent } from "./macros/sitecore-macros";
import { findFoblesFrame, findFrameWithSelector } from "./frame-finder";
import type { TestInfo } from "@playwright/test";
import { expectLBoltButton } from "./expectSnippets/expectSnippets";
import type { StrategyScenarioData, StrategyTestContext } from "./strategies/support/scenario.types";
import type { FoblesTestStep } from "./types";
import { logStepDividerStart } from "./helpers/logging-helpers";
import { createStep, getEditorSectionLocator } from "./fobles-helpers";

// table by its label text plus the toolbar's feature button.
export async function factoryStrategyTestContext(
  page: Page,
  scenario: StrategyScenarioData,
  testInfo: TestInfo,
): Promise<StrategyTestContext> {
  const testContext: StrategyTestContext = {
    getFieldTable,
    page,
    fieldTable: undefined as unknown as Locator,
    locatorFirstResult: undefined as unknown as Locator,
    getScLocatorFirstResult: getScLocatorFirstResult,
    STEP_WAIT_MS: CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS,
    step: () =>
      Promise.reject(new Error("step not initialized")),
    SCENARIO: scenario,
    testInfo,
  };

  const fieldTable = await testContext.getFieldTable();
  testContext.step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), scenario.friendlyName);

  // remove after legacy properties are unused
  testContext.fieldTable = fieldTable;
  testContext.locatorFirstResult = await testContext.getScLocatorFirstResult();
  console.log(`[fobles] Strategy field activation setup complete`);

  return testContext;

}

async function getScLocatorFirstResult(
  this: StrategyTestContext,
): Promise<Locator> {
  return (await this.getFieldTable())
    .locator(this.SCENARIO.scElemLocator)
    .first();
}



async function getFieldTable(
  this: StrategyTestContext,
): Promise<Locator> {
  const foblesFrame = await findFoblesFrame(this.page);

  return foblesFrame
    .locator(
      `xpath=//*[contains(text(), 
      '${this.SCENARIO.scElemFieldLabel}')]/ancestor::table[1]`,
    )
    .first();
}