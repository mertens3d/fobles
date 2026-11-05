// @source-path [Fobles] tests/helpers/locator-helpers.ts

import { TEST_CONST } from "../constants/TEST_CONST";
import type { Page, Frame } from "../fixtures/playwright";
import { findFrameWithSelector } from "./frame-finder";

export async function locateJumpFlyoutTrigger(page: Page) {
  const foblesFrame = await locateFobleFrame(page);
  const jumpFlyoutTrigger = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER);
  return jumpFlyoutTrigger;
}

export async function locateFobleFrame(page: Page): Promise<Frame>{
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
