import {
  expect,
  type Frame,
  type Locator,
} from "../fixtures/playwright";
import { TEST_CONST } from "../CONST";

export async function getJumpFlyoutButton(
  foblesFrame: Frame,
  index: number,
) : Promise<Locator> {
  const foblesJumpFlyoutButton = foblesFrame
    .locator(TEST_CONST.FOBLES.SELECTORS.DATA.FOBLES_TREE_JUMP_PATH)
    .nth(index);
  await expect(foblesJumpFlyoutButton).toBeVisible();
//   await foblesJumpFlyoutButton.scrollIntoViewIfNeeded();
  return foblesJumpFlyoutButton;
}