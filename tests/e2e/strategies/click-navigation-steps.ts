import { expect, type Locator, type Page, type TestInfo } from "../fixtures/playwright";
import {
  createStep,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import type { NavigableStrategyScenarioData } from "./scenario.types";

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
export async function runClickNavigationSteps(
  step: ReturnType<typeof createStep>,
  page: Page,
  testInfo: TestInfo,
  fieldTable: Locator,
  lboltButton: Locator,
  fieldLocator: Locator,
  scenario: NavigableStrategyScenarioData,
  onToggledOff?: () => Promise<void>,
  navigationButton?: Locator,
): Promise<void> {
  const foblesButton = navigationButton ?? fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();

  await step(
    `Ctrl+click: opens the target item in a new tab: "${scenario.expectedFoValue}"`,
    async (fullTitle) => {
      await expectFoblesButtonNewTabNavigation(page, testInfo, foblesButton, scenario.expectedFoValue, fullTitle);
    },
    { screenshot: false },
  );

  await step("Toggle Fobles off: the field returns to its original shape", async () => {
    await clickLboltButton(page, lboltButton);
    await expect(fieldLocator).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
    await expect(fieldLocator).not.toHaveAttribute(FOBLES.ATTRIBUTES.PROCESSED, "1");
    await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    await onToggledOff?.();
  });

  // Toggle back on to reveal the button again for the click test below - no screenshot needed,
  // already captured above.
  await clickLboltButton(page, lboltButton);

  await step(
    `Click navigates to the target item: "${scenario.expectedFoValue}"`,
    async (fullTitle) => {
      await expectFoblesButtonSameTabNavigation(page, testInfo, foblesButton, scenario.expectedFoValue, fullTitle);
    },
    { screenshot: false },
  );
}
