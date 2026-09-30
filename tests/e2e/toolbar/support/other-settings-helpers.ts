
import { expect, type Locator, type Page } from "../../../fixtures/playwright";
import { clickExtensionControl, fillExtensionInput, setExtensionCheckbox } from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import type { menuTarget } from "../toolbar-other.spec";
import { findFoblesFrame } from "../../../helpers/frame-finder";

const TESTING = CONST.TESTING;


export async function saveJumpMenuButtons(optionsPage: Page): Promise<void> {
  await clickExtensionControl(
    optionsPage,
    optionsPage.getByRole("button", { name: CONST.TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON }),
    CONST.TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON,
  );
  await expect(optionsPage.locator("#jump-menu-buttons-status")).toHaveText(
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
    if ((await row.locator("input[name='label']").inputValue()) === CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label) {
      await clickExtensionControl(
        optionsPage,
        row.locator(".user-tree-jump-remove"),
        "Remove User Tree Jump",
      );
      removedAny = true;
    }
  }
  if (removedAny) await saveJumpMenuButtons(optionsPage);
}

// Adds our test row via the real "+ Add User Tree Jump" button and fields, then saves. Only ever
// called once per test, right after removeTestRowIfPresent, so the newly added row is always the
// last (and only) one.
export async function addTestRow(optionsPage: Page): Promise<Locator> {
  const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
  await clickExtensionControl(
    optionsPage,
    treeJumpsColumn.getByRole("button", { name: "+ Add User Tree Jump" }),
    "+ Add User Tree Jump",
  );
  const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
  await fillExtensionInput(
    optionsPage,
    row.locator("input[name='label']"),
    CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
    "Tree Jump label",
  );
  await fillExtensionInput(
    optionsPage,
    row.locator("input[name='pathSuffix']"),
    CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw,
    "Tree Jump path",
  );
  await fillExtensionInput(
    optionsPage,
    row.locator("input[name='icon']"),
    CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.iconRaw,
    "Tree Jump icon",
  );
  await saveJumpMenuButtons(optionsPage);
  return row;
}

export async function setTestRowEnabled(optionsPage: Page, row: Locator, enabled: boolean): Promise<void> {
  await openTreeJumpsColumn(optionsPage);
  const enabledCheckbox = row.locator("input[name='enabled']");
  if ((await enabledCheckbox.isChecked()) !== enabled) {
    await setExtensionCheckbox(optionsPage, enabledCheckbox, enabled, "User Tree Jump enabled");
  }
  await saveJumpMenuButtons(optionsPage);
}

export async function openTreeJumpsColumn(optionsPage: Page): Promise<Locator> {
  const quickJumpSection = optionsPage.locator(TESTING.OPTIONS.SECTION_SELECTOR).filter({
    has: optionsPage.locator(TESTING.OPTIONS.SUMMARY_SELECTOR, {
      hasText: TESTING.OPTIONS.ADMIN_PAGES.JUMP_MENU_SECTION_TITLE,
    }),
  });
  const jumpMenuIsOpen = await quickJumpSection.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );
  if (!jumpMenuIsOpen) {
    await clickExtensionControl(
      optionsPage,
      quickJumpSection.locator(TESTING.OPTIONS.SUMMARY_DIRECT_CHILD_SELECTOR),
      TESTING.OPTIONS.ADMIN_PAGES.JUMP_MENU_SECTION_TITLE,
    );
  }

  const treeJumpsColumn = optionsPage
    .locator(TESTING.JUMP_MENU.ADMIN_PAGES_COLUMN_SELECTOR)
    .filter({
      has: optionsPage.locator(TESTING.OPTIONS.SUMMARY_SELECTOR, {
        hasText: TESTING.OPTIONS.TREE_JUMPS_COLUMN_TITLE,
      }),
    });
  const treeJumpsAreOpen = await treeJumpsColumn.evaluate(
    (element) => (element as HTMLDetailsElement).open,
  );
  if (!treeJumpsAreOpen) {
    await clickExtensionControl(
      optionsPage,
      treeJumpsColumn.locator(TESTING.OPTIONS.SUMMARY_SELECTOR),
      TESTING.OPTIONS.TREE_JUMPS_COLUMN_TITLE,
    );
  }
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