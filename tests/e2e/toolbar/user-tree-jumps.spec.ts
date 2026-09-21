import { expect, test, type Page } from "../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../fixtures/extension";
import { CONST } from "../CONST";
import { getLastKnownMousePosition, moveMouseTo, pulseMouseMarkerClick } from "../mouse-proxy";
import { activateFoblesForJumpTest, createStep } from "../fobles-helpers";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const USER_TREE_JUMPS_STORAGE_KEY = "userTreeJumps";
const TEST_JUMP = {
  id: "e2e-user-tree-jump-1",
  label: "QA User Tree Jump",
  enabled: true,
  icon: "/-/icon/applicationsv2/32x32/bookmark_green.png",
  pathSuffix: "content/Home",
};
const TEST_JUMP_PATH = "/sitecore/content/Home";

async function readUserTreeJumps(extensionPage: Page): Promise<unknown> {
  return extensionPage.evaluate(
    (key) => chrome.storage.sync.get(key).then((result) => result[key]),
    USER_TREE_JUMPS_STORAGE_KEY,
  );
}

async function writeUserTreeJumps(extensionPage: Page, entries: unknown[]): Promise<void> {
  await extensionPage.evaluate(
    ({ key, value }) => chrome.storage.sync.set({ [key]: value }),
    { key: USER_TREE_JUMPS_STORAGE_KEY, value: entries },
  );
}

async function clearUserTreeJumps(extensionPage: Page): Promise<void> {
  await extensionPage.evaluate((key) => chrome.storage.sync.remove(key), USER_TREE_JUMPS_STORAGE_KEY);
}

test.describe("User Tree Jumps", () => {
  test("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");

    try {
      await clearUserTreeJumps(optionsPage);
      await optionsPage.getByText("Quick Menu Buttons", { exact: true }).click();
      const treeJumpsColumn = optionsPage.locator(".quick-menu-column", { hasText: "Tree Jumps" });
      await treeJumpsColumn.locator("summary").click();
      await treeJumpsColumn.getByRole("button", { name: "+ Add User Tree Jump" }).click();

      const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
      await row.locator("input[name='label']").fill(TEST_JUMP.label);
      await row.locator("input[name='pathSuffix']").fill(`/${TEST_JUMP.pathSuffix}`);
      await row.locator("input[name='icon']").fill("applicationsv2/32x32/bookmark_green.png");

      await optionsPage.getByRole("button", { name: "Save quick menu buttons" }).click();
      await expect(optionsPage.locator("#quick-menu-buttons-status")).toHaveText(
        "Quick menu buttons saved.",
      );

      const stored = await readUserTreeJumps(optionsPage);
      expect(Array.isArray(stored) && stored.length).toBe(1);
      const [savedEntry] = stored as Array<Record<string, unknown>>;
      expect(savedEntry).toMatchObject({
        label: TEST_JUMP.label,
        enabled: true,
        icon: TEST_JUMP.icon,
        pathSuffix: TEST_JUMP.pathSuffix,
      });
    } finally {
      await clearUserTreeJumps(optionsPage);
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
      await clearUserTreeJumps(optionsPage);
      const foblesFrame = await activateFoblesForJumpTest(page, scenario);
      const menuButton = foblesFrame.locator(".fobles-quick-menu-trigger").first();
      const menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
      const mousePosition = getLastKnownMousePosition();

      await moveMouseTo(page, menuButton, mousePosition, "User Tree Jump menu");
      await menuButton.click();
      await page.waitForTimeout(STEP_WAIT_MS);
      await expect(menuFlyout).toHaveAttribute("data-visible", "true");

      await step("does not render with an empty list", async () => {
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      }, { screenshot: false });

      await step("appears live after saving, without a page refresh", async () => {
        await writeUserTreeJumps(optionsPage, [TEST_JUMP]);
        await expect(foblesFrame.getByText("User Tree Jumps")).toBeVisible();
        await expect(foblesFrame.getByRole("button", { name: TEST_JUMP.label })).toBeVisible();
      });

      await step("hides live again once disabled", async () => {
        await writeUserTreeJumps(optionsPage, [{ ...TEST_JUMP, enabled: false }]);
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      await step(`re-enabled entry navigates to "${TEST_JUMP_PATH}"`, async () => {
        await writeUserTreeJumps(optionsPage, [TEST_JUMP]);
        const jumpButton = foblesFrame.getByRole("button", { name: TEST_JUMP.label });
        await expect(jumpButton).toBeVisible();
        await expect(jumpButton).toHaveAttribute("data-fobles-tree-jump-path", TEST_JUMP_PATH);
        await jumpButton.scrollIntoViewIfNeeded();
        await moveMouseTo(page, jumpButton, mousePosition, TEST_JUMP.label);
        await page.waitForTimeout(STEP_WAIT_MS);
        await pulseMouseMarkerClick(page);
        await jumpButton.click();

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(TEST_JUMP_PATH)), {
            timeout: CONST.TIMEOUTS.URL_WAIT_MS,
          }),
          confirmationDialog.getByRole("button", { name: "Continue" }).click(),
        ]);
        expect(page.url()).toContain(encodeURI(TEST_JUMP_PATH));
      }, { screenshot: false });
    } finally {
      await clearUserTreeJumps(optionsPage);
      await optionsPage.close();
    }
  });
});
