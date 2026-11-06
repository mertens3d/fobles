// @source-path [Fobles] tests/helpers/locator-helpers.ts

import { TEST_CONST } from "../constants/TEST_CONST";
import type { Page, Frame } from "../fixtures/playwright";
import { findFoblesFrame, findFrameWithSelector } from "./frame-finder";

export async function locateJumpFlyoutTrigger(page: Page) {
  const foblesFrame = await locateFobleFrame(page);
  const jumpFlyoutTrigger = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER);
  return jumpFlyoutTrigger;
}

export async function locateFobleFrame(page: Page): Promise<Frame> {
  const foblesFrame = await findFrameWithSelector(
    page,
    TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER,
    `${locateFobleFrame.name}`,
    10000,
  );
  return foblesFrame;
}

export async function locateJumpFlyout(page: Page) {
  console.log(`${locateJumpFlyout.name} called`);
  const foblesFrame = await locateFobleFrame(page);
  const jumpFlyout = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT);
  return jumpFlyout;
}

export async function locateToolbarContainer(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const container = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER).first();
  return container;
}

export async function locateLBoltButton(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const button = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.LBOLT_BUTTON).first();
  return button;
}

export async function locateEditorTabs(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const tabs = foblesFrame.locator("#EditorTabs").first();
  return tabs;
}

export async function locateQuickInfoTable(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const quickInfoTable = foblesFrame.locator(TEST_CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE).first();
  return quickInfoTable;
}