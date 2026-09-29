// A field-strategy spec's own hand-harvested-from-YAML values (tests/README.md#hardcoded-expected-
// values) grouped into one object instead of scattered top-level consts, so it's visually clear
// which values came from looking up the serialized test data versus other file-level constants

import type { Locator, Page, TestInfo    } from "../../fixtures/playwright";
import type { FoblesTestStep } from "../../types";

// (e.g. STEP_WAIT_MS, SCREENSHOT_BASE_NAME).
export type StrategyScenarioData = {
  expectedButtonText: string;
  expectedFoValue: string;
  scElemFieldLabel: string;
  friendlyName: string;
  itemId: string;
  visibleToFobles: boolean;
  scElemLocator: string;
  SCREENSHOT_BASE_NAME: string;
};


export type StrategyTestContext ={
  SCENARIO: StrategyScenarioData;
  page: Page;
  step: FoblesTestStep;
  fieldTable: Locator;
  getFieldTable(): Promise<Locator>;
  locatorFirstResult: Locator;
  getScLocatorFirstResult(): Promise<Locator>;
  STEP_WAIT_MS: number;
  testInfo: TestInfo;
};