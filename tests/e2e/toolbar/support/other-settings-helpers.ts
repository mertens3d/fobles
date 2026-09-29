
import { expect, type Frame, type Locator, type Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import type { menuTarget } from "../toolbar-other.spec";
import { findFoblesFrame } from "../../frame-finder";


export async function saveQuickMenuButtons(optionsPage: Page): Promise<void> {
  await optionsPage.getByRole("button", { name: "Save quick menu buttons" }).click();
  await expect(optionsPage.locator("#quick-menu-buttons-status")).toHaveText(
    "Quick menu buttons saved.",
  );
}

// A previous interrupted run may have left our test row behind - remove it (by its own label, not
// just "the last row") and save, so every test starts from a genuinely empty list.
export async function removeTestRowIfPresent(optionsPage: Page): Promise<void> {
  const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
  const rows = treeJumpsColumn.locator(".user-tree-jump-row");
  const rowCount = await rows.count();
  let removedAny = false;

  for (let index = rowCount - 1; index >= 0; index -= 1) {
    const row = rows.nth(index);
    if ((await row.locator("input[name='label']").inputValue()) === CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label) {
      await row.locator(".user-tree-jump-remove").click();
      removedAny = true;
    }
  }
  if (removedAny) await saveQuickMenuButtons(optionsPage);
}

// Adds our test row via the real "+ Add User Tree Jump" button and fields, then saves. Only ever
// called once per test, right after removeTestRowIfPresent, so the newly added row is always the
// last (and only) one.
export async function addTestRow(optionsPage: Page): Promise<Locator> {
  const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
  await treeJumpsColumn.getByRole("button", { name: "+ Add User Tree Jump" }).click();
  const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
  await row.locator("input[name='label']").fill(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label);
  await row.locator("input[name='pathSuffix']").fill(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw);
  await row.locator("input[name='icon']").fill(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.iconRaw);
  await saveQuickMenuButtons(optionsPage);
  return row;
}

export async function setTestRowEnabled(optionsPage: Page, row: Locator, enabled: boolean): Promise<void> {
  await openTreeJumpsColumn(optionsPage);
  const enabledCheckbox = row.locator("input[name='enabled']");
  if ((await enabledCheckbox.isChecked()) !== enabled) {
    await enabledCheckbox.click();
  }
  await saveQuickMenuButtons(optionsPage);
}

export async function openTreeJumpsColumn(optionsPage: Page): Promise<Locator> {
  await optionsPage.getByText("Quick Menu Buttons", { exact: true }).click();
  const treeJumpsColumn = optionsPage.locator(".quick-menu-column", { hasText: "Tree Jumps" });
  await treeJumpsColumn.locator("summary").click();
  return treeJumpsColumn;
}

export async function getFoblesMenuTargets(page: Page) {
    const foblesFrame = await findFoblesFrame(page);
    const menuButtons = foblesFrame.locator(CONST.FOBLES.LOCATORS.MENU_URL);
    const menuAttribute = CONST.FOBLES.ATTRIBUTES.MENU_URL;
    const targets: menuTarget[] = await menuButtons.evaluateAll(
      (buttons,attribute) => 
        buttons.map((button) => ({
        label: button.textContent?.trim() ?? "",
        url: button.getAttribute(attribute) ?? "",
    })),
    menuAttribute
    );
    return targets;
}