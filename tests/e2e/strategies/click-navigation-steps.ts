import { CONST } from "../../CONST";
import { type Locator, type Page, type TestInfo } from "../../fixtures/playwright";


import type { FoblesStep } from "../../helpers/fobles-test-step.types";

import type {  StrategyScenarioData } from "./support/scenario.types";

// Every field-strategy spec runs this exact same 4-step tail after decorating its field: Ctrl+
// click (new tab), toggle off (restores), a bare re-toggle back on (no step/screenshot - the
// button just needs to be visible again for the next check), then a plain click (same tab). Only
// the scenario's own expected values and the field-specific locator to assert against differ.
// onToggledOff is an escape hatch for specs with extra toggle-off assertions of their own (e.g.
// droplink's toHaveScreenshot visual-regression check) that the shared tail doesn't otherwise do.
// navigationButton is an escape hatch for specs whose field can render more than one Fobles button
// in fieldTable (e.g. Tree List's "all items" tree pane renders one button per browsable node,
// including ancestor folders, not just the actual selected value) - fieldTable.locator(BUTTON)
// .first() would then click whichever button happens to come first in the DOM, not necessarily
// the scenario's own expected value. Defaults to that same fieldTable-wide lookup for every other
// strategy, which only ever renders the one button it needs.
export function runClickNavigationSteps(
  step: FoblesStep,
  page: Page,
  testInfo: TestInfo,
  fieldTable: Locator,
  fieldLocator: Locator,
  scenario: StrategyScenarioData,
  onToggledOff?: () => Promise<void>,
  navigationButton?: Locator,
): void {
  const foblesButton = navigationButton ?? fieldTable.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON).first();

 
}
