import {
  expect,
  type Frame,
  type Locator,
} from "../fixtures/playwright";
import { CONST } from "../CONST";

export async function getJumpMenuFlyoutButton(
  foblesFrame: Frame,
  index: number,
) : Promise<Locator> {
  const foblesJumpFlyoutButton = foblesFrame
    .locator(CONST.FOBLES.SELECTORS.DATA.FOBLES_TREE_JUMP_PATH)
    .nth(index);
  await expect(foblesJumpFlyoutButton).toBeVisible();
//   await foblesJumpFlyoutButton.scrollIntoViewIfNeeded();
  return foblesJumpFlyoutButton;
}