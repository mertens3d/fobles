// A field-strategy spec's own hand-harvested-from-YAML values (tests/README.md#hardcoded-expected-
// values) grouped into one object instead of scattered top-level consts, so it's visually clear
// which values came from looking up the serialized test data versus other file-level constants

import type { Page, Locator, TestInfo } from "@playwright/test";
import type { FoblesStep } from "../../../helpers/fobles-test-step.types";

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
  // Overrides the default fieldTable-wide "first Fobles button" lookup - needed when a field
  // renders more than one independent Fobles button (e.g. Multilist with Search's "all items" and
  // "selected items" panes each get their own), where the default .first() isn't reliably the
  // scenario's own expected value.
  foblesButtonSelector?: string;
};

export type StrategyTestContext  = TestContextBase& {
  fieldTable: Locator;
  getFieldTable(): Promise<Locator>;
  getScLocatorFirstResult(): Promise<Locator>;
  locatorFirstResult: Locator;
  SCENARIO: StrategyScenarioData;
};

export type TestContextBase ={
  page: Page;
  STEP_WAIT_MS: number;
  step: FoblesStep;
  testInfo: TestInfo;
};