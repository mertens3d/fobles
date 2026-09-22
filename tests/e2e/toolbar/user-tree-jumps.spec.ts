import { expect, test, type Locator, type Page } from "../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../fixtures/extension";
import { CONST } from "../CONST";
import { clickWithMouseMarker } from "../mouse-proxy";
import { openSitecorePageAndFindFoblesFrame, createStep } from "../fobles-helpers";

// Bare (unnormalized) values as a real user would type them - the "adds and normalizes" test
// below asserts they come back out normalized after a save + reload.
const TEST_JUMP = {
  label: "QA User Tree Jump",
  pathSuffixRaw: "/content/Home",
  iconRaw: "applicationsv2/32x32/bookmark_green.png",
};
const TEST_JUMP_PATH = "/sitecore/content/Home";
const TEST_JUMP_ICON_NORMALIZED = "/-/icon/applicationsv2/32x32/bookmark_green.png";

async function openTreeJumpsColumn(optionsPage: Page): Promise<Locator> {
  await optionsPage.getByText("Quick Menu Buttons", { exact: true }).click();
  const treeJumpsColumn = optionsPage.locator(".quick-menu-column", { hasText: "Tree Jumps" });
  await treeJumpsColumn.locator("summary").click();
  return treeJumpsColumn;
}

async function saveQuickMenuButtons(optionsPage: Page): Promise<void> {
  await optionsPage.getByRole("button", { name: "Save quick menu buttons" }).click();
  await expect(optionsPage.locator("#quick-menu-buttons-status")).toHaveText(
    "Quick menu buttons saved.",
  );
}

// A previous interrupted run may have left our test row behind - remove it (by its own label, not
// just "the last row") and save, so every test starts from a genuinely empty list.
async function removeTestRowIfPresent(optionsPage: Page): Promise<void> {
  const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
  const rows = treeJumpsColumn.locator(".user-tree-jump-row");
  const rowCount = await rows.count();
  let removedAny = false;

  for (let index = rowCount - 1; index >= 0; index -= 1) {
    const row = rows.nth(index);
    if ((await row.locator("input[name='label']").inputValue()) === TEST_JUMP.label) {
      await row.locator(".user-tree-jump-remove").click();
      removedAny = true;
    }
  }
  if (removedAny) await saveQuickMenuButtons(optionsPage);
}

// Adds our test row via the real "+ Add User Tree Jump" button and fields, then saves. Only ever
// called once per test, right after removeTestRowIfPresent, so the newly added row is always the
// last (and only) one.
async function addTestRow(optionsPage: Page): Promise<Locator> {
  const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
  await treeJumpsColumn.getByRole("button", { name: "+ Add User Tree Jump" }).click();
  const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
  await row.locator("input[name='label']").fill(TEST_JUMP.label);
  await row.locator("input[name='pathSuffix']").fill(TEST_JUMP.pathSuffixRaw);
  await row.locator("input[name='icon']").fill(TEST_JUMP.iconRaw);
  await saveQuickMenuButtons(optionsPage);
  return row;
}

async function setTestRowEnabled(optionsPage: Page, row: Locator, enabled: boolean): Promise<void> {
  await openTreeJumpsColumn(optionsPage);
  const enabledCheckbox = row.locator("input[name='enabled']");
  if ((await enabledCheckbox.isChecked()) !== enabled) {
    await enabledCheckbox.click();
  }
  await saveQuickMenuButtons(optionsPage);
}

test.describe("User Tree Jumps", () => {
  test("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");

    try {
      await removeTestRowIfPresent(optionsPage);
      await addTestRow(optionsPage);

      // Reload and re-open rather than trusting the in-memory row - proves the normalized values
      // actually round-tripped through storage, not just what the fields happened to still show.
      await optionsPage.reload();
      const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
      const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
      await expect(row.locator("input[name='label']")).toHaveValue(TEST_JUMP.label);
      await expect(row.locator("input[name='pathSuffix']")).toHaveValue(
        TEST_JUMP.pathSuffixRaw.replace(/^\/+/, ""),
      );
      await expect(row.locator("input[name='icon']")).toHaveValue(TEST_JUMP_ICON_NORMALIZED);
      await expect(row.locator("input[name='enabled']")).toBeChecked();
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });

  test("toolbar renders, live-updates, hides, and navigates a User Tree Jump", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = CONST.SCENARIOS[0];
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");
    const step = createStep(page, testInfo, page, "User Tree Jump");

    try {
      await removeTestRowIfPresent(optionsPage);
      const foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);
      const menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
      const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();

      await clickWithMouseMarker(page, menuButton, "User Tree Jump menu");
      await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

      await step("does not render with an empty list", async () => {
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      }, { screenshot: false });

      let row!: Locator;
      await step("appears live after saving, without a page refresh", async () => {
        row = await addTestRow(optionsPage);
        await expect(foblesFrame.getByText("User Tree Jumps")).toBeVisible();
        await expect(foblesFrame.getByRole("button", { name: TEST_JUMP.label })).toBeVisible();
      });

      await step("hides live again once disabled", async () => {
        await setTestRowEnabled(optionsPage, row, false);
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      await step(`re-enabled entry navigates to "${TEST_JUMP_PATH}"`, async () => {
        await setTestRowEnabled(optionsPage, row, true);
        const jumpButton = foblesFrame.getByRole("button", { name: TEST_JUMP.label });
        await expect(jumpButton).toBeVisible();
        await expect(jumpButton).toHaveAttribute("data-fobles-tree-jump-path", TEST_JUMP_PATH);
        await jumpButton.scrollIntoViewIfNeeded();
        await clickWithMouseMarker(page, jumpButton, TEST_JUMP.label);

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(TEST_JUMP_PATH)), {
            timeout: CONST.TIMEOUTS.URL_WAIT_MS,
          }),
          clickWithMouseMarker(
            page,
            confirmationDialog.getByRole("button", { name: CONST.SITECORE.LABELS.CONTINUE_BUTTON }),
            "Confirm dialog Continue",
          ),
        ]);
        expect(page.url()).toContain(encodeURI(TEST_JUMP_PATH));
      }, { screenshot: false });
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
});
