import { expect, type Locator, type Page } from "../../fixtures/playwright";
import { clickExtensionControl, fillExtensionInput } from "../../fixtures/extension";
import { CONST } from "../../CONST";

export const TESTING = CONST.TESTING;

export type StoredSettingsSnapshot = {
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
};

export async function clickOptionsButton(page: Page, label: string): Promise<void> {
  await clickExtensionControl(page, page.getByRole("button", { name: label }), label);
}

export async function fillOptionsInput(page: Page, input: Locator, value: string): Promise<void> {
  const inputName = await input.getAttribute("name");
  await fillExtensionInput(page, input, value, inputName ?? "Settings field");
}

export async function openSettingsSection(page: Page, title: string): Promise<void> {
  const section = page.locator(TESTING.OPTIONS.SECTION_SELECTOR).filter({
    has: page.locator(TESTING.OPTIONS.SUMMARY_SELECTOR, { hasText: title }),
  });
  await expect(section).toHaveCount(1);
  const isOpen = await section.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) {
    await clickExtensionControl(
      page,
      section.locator(TESTING.OPTIONS.SUMMARY_DIRECT_CHILD_SELECTOR),
      title,
    );
  }
}

export async function readStableCheckboxState(checkbox: Locator): Promise<boolean> {
  let previousState: boolean | undefined;
  let stableReads = 0;

  await expect
    .poll(
      async () => {
        const currentState = await checkbox.isChecked();
        stableReads = currentState === previousState ? stableReads + 1 : 0;
        previousState = currentState;
        return stableReads >= 2;
      },
      { intervals: [100, 200, 300] },
    )
    .toBe(true);

  return previousState ?? false;
}

export async function findGroupByName(page: Page, name: string): Promise<Locator | null> {
  const groups = page.locator(TESTING.OPTIONS.AI_PAGES.GROUP_SELECTOR);
  for (let index = 0; index < (await groups.count()); index += 1) {
    const group = groups.nth(index);
    if ((await group.locator(CONST.TESTING.SELECTORS.AI_MAPPING_NAME_INPUT).inputValue()) === name) {
      return group;
    }
  }
  return null;
}

export async function findAdminPageByLabel(page: Page, label: string): Promise<Locator | null> {
  const rows = page.locator(TESTING.OPTIONS.ADMIN_PAGES.ROW_SELECTOR);
  for (let index = 0; index < (await rows.count()); index += 1) {
    const row = rows.nth(index);
    if ((await row.locator(TESTING.OPTIONS.ADMIN_PAGES.LABEL_INPUT).inputValue()) === label) {
      return row;
    }
  }
  return null;
}

export async function openAdminPagesColumn(page: Page): Promise<Locator> {
  await openSettingsSection(page, TESTING.OPTIONS.ADMIN_PAGES.JUMP_FLYOUT_SECTION_TITLE);
  const column = page.locator(TESTING.JUMP_FLYOUT.ADMIN_PAGES_COLUMN_SELECTOR).filter({
    has: page.locator(TESTING.OPTIONS.SUMMARY_SELECTOR, {
      hasText: TESTING.OPTIONS.ADMIN_PAGES.COLUMN_TITLE,
    }),
  });
  await expect(column).toHaveCount(1);
  const isOpen = await column.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) {
    await clickExtensionControl(
      page,
      column.locator(TESTING.OPTIONS.SUMMARY_SELECTOR),
      TESTING.OPTIONS.ADMIN_PAGES.COLUMN_TITLE,
    );
  }
  return column;
}
