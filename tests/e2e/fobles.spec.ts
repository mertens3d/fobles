import { expect, test } from "./fixtures/playwright";
import { CONST } from "./CONST";
import { activateFoblesForJumpTest } from "./fobles-helpers";
import { hoverOverMenuButton } from "./hover-helpers";
import { moveMouseTo } from "./mouse-proxy";
import { testLogger } from "../testLogger";
import {
  EXPECTED_MENU_URLS,
  EXPECTED_TREE_JUMP_PATHS,
} from "./expected-menu";

const STEP_WAIT_MS =
  CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const SCENARIO = CONST.SCENARIOS[0];

type MenuContext = Awaited<ReturnType<typeof activateFoblesForJumpTest>>;

type MenuSetup = {
  foblesFrame: MenuContext;
  menuButton: ReturnType<MenuContext["locator"]>;
  menuFlyout: ReturnType<MenuContext["locator"]>;
  mousePosition: { x: number; y: number };
};

async function openMenu(
  page: Parameters<typeof activateFoblesForJumpTest>[0],
  label: string,
): Promise<MenuSetup> {
  const foblesFrame = await activateFoblesForJumpTest(page, SCENARIO);
  const menuButton = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
    .first();
  const menuFlyout = foblesFrame
    .locator(CONST.SITECORE.SELECTORS.QUICK_MENU)
    .first();
  const mousePosition = { x: 0, y: 0 };
  await hoverOverMenuButton(
    page,
    menuButton,
    menuFlyout,
    mousePosition,
    label,
  );
  return { foblesFrame, menuButton, menuFlyout, mousePosition };
}

async function readAttributeValues(
  locator: ReturnType<MenuContext["locator"]>,
  attributeName: string,
): Promise<string[]> {
  return locator.evaluateAll(
    (buttons, name) =>
      buttons
        .map((button) => button.getAttribute(name))
        .filter((value): value is string => value !== null),
    attributeName,
  );
}

test.describe("Fobles browser integration", () => {
  test.describe("Hover behavior", () => {
    test.skip(`${SCENARIO.name} creates expected Fobles`, async () => {
      testLogger.info("Hover behavior remains covered by the skipped scenario test");
    });
  });

  test.describe("Tree jump buttons", () => {
    test("renders the expected tree-jump buttons", async ({ page }) => {
      const { foblesFrame } = await openMenu(page, CONST.SITECORE.SELECTORS.MENU_TRIGGER);
      const paths = await readAttributeValues(
        foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON),
        CONST.ATTRIBUTES.TREE_JUMP_PATH,
      );
      expect(paths).toEqual(EXPECTED_TREE_JUMP_PATHS);
    });

    for (const [index, path] of EXPECTED_TREE_JUMP_PATHS.entries()) {
      test(`navigates to '${path}' in the current tab`, async ({ page }) => {
        const { foblesFrame, mousePosition } = await openMenu(page, CONST.SITECORE.SELECTORS.MENU_TRIGGER);
        const jumpButton = foblesFrame
          .locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON)
          .nth(index);
        testLogger.step(`Find tree-jump button '${path}'`);
        await expect(jumpButton).toBeVisible();
        await jumpButton.scrollIntoViewIfNeeded();
        testLogger.step(`Move mouse to tree-jump button '${path}'`);
        await moveMouseTo(page, jumpButton, mousePosition, `Tree jump '${path}'`);
        testLogger.pause(STEP_WAIT_MS);
        await page.waitForTimeout(STEP_WAIT_MS);
        testLogger.step(`Click tree-jump button '${path}'`);
        await jumpButton.click();
        testLogger.waitFor(
          `tree-jump confirmation dialog '${path}'`,
          CONST.TIMEOUTS.MENU_VISIBLE_MS,
        );
        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible({
          timeout: CONST.TIMEOUTS.MENU_VISIBLE_MS,
        });
        await Promise.all([
          (async () => {
            testLogger.waitFor(
              `URL containing ${path}`,
              CONST.TIMEOUTS.URL_WAIT_MS,
            );
            await page.waitForURL((url) =>
              url.toString().includes(encodeURI(path)), {
                timeout: CONST.TIMEOUTS.URL_WAIT_MS,
              });
          })(),
          confirmationDialog.getByRole("button", { name: "Continue" }).click(),
        ]);
        expect(page.url()).toContain(encodeURI(path));
      });
    }
  });

  test.describe("Ctrl-click tree jump buttons", () => {
    test("renders the expected Ctrl-click tree-jump buttons", async ({ page }) => {
      const { foblesFrame } = await openMenu(page, CONST.SITECORE.SELECTORS.MENU_TRIGGER);
      const paths = await readAttributeValues(
        foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON),
        CONST.ATTRIBUTES.TREE_JUMP_PATH,
      );
      expect(paths).toEqual(EXPECTED_TREE_JUMP_PATHS);
    });

    for (const [index, path] of EXPECTED_TREE_JUMP_PATHS.entries()) {
      test(`opens '${path}' in a new tab with Ctrl-click`, async ({
        browserContext,
        page,
      }) => {
        const { foblesFrame, menuButton, menuFlyout, mousePosition } =
          await openMenu(page, CONST.SITECORE.SELECTORS.MENU_TRIGGER);
        const jumpButton = foblesFrame
          .locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON)
          .nth(index);
        await jumpButton.scrollIntoViewIfNeeded();
        await moveMouseTo(page, jumpButton, mousePosition, `Ctrl-click jump '${path}'`);
        testLogger.pause(STEP_WAIT_MS);
        await page.waitForTimeout(STEP_WAIT_MS);
        testLogger.step(`Ctrl-click tree-jump button '${path}'`);
        const newTabPromise = browserContext.waitForEvent("page");
        await jumpButton.click({ modifiers: ["Control"] });
        const newTab = await newTabPromise;
        await newTab.waitForLoadState("domcontentloaded").catch(() => undefined);
        expect(newTab.url()).toContain(encodeURI(path));
        await newTab.close();
        await hoverOverMenuButton(
          page,
          menuButton,
          menuFlyout,
          mousePosition,
          CONST.SITECORE.SELECTORS.MENU_TRIGGER,
        );
      });
    }
  });

  test.describe("Other menu buttons", () => {
    test("renders the expected menu URL buttons", async ({ page }) => {
      const { foblesFrame } = await openMenu(page, CONST.SITECORE.SELECTORS.MENU_URL_BUTTON);
      const targets = await foblesFrame
        .locator(CONST.SITECORE.SELECTORS.MENU_URL_BUTTON)
        .evaluateAll(
          (buttons, attributeName) =>
            buttons.map((button) => ({
              label: button.textContent?.trim() ?? "",
              url: button.getAttribute(attributeName) ?? "",
            })),
          CONST.ATTRIBUTES.MENU_URL,
        );
      expect(targets).toEqual(EXPECTED_MENU_URLS);
    });

    for (const target of EXPECTED_MENU_URLS) {
      test(`navigates to '${target.label}'`, async ({ page }) => {
        const { foblesFrame, mousePosition } = await openMenu(page, CONST.SITECORE.SELECTORS.MENU_URL_BUTTON);
        const button = foblesFrame
          .locator(CONST.SITECORE.SELECTORS.MENU_URL_BUTTON)
          .filter({ hasText: target.label })
          .first();
        testLogger.step(`Find menu URL button '${target.label}'`);
        await expect(button).toBeVisible();
        await button.scrollIntoViewIfNeeded();
        await moveMouseTo(page, button, mousePosition, `Menu '${target.label}'`);
        await page.waitForTimeout(STEP_WAIT_MS);
        testLogger.step(`Click menu URL button '${target.label}'`);
        await button.click();
        testLogger.waitFor(
          `URL containing ${target.url}`,
          CONST.TIMEOUTS.URL_WAIT_MS,
        );
        await page.waitForURL(
          (url) => url.toString().includes(encodeURI(target.url)),
          { timeout: CONST.TIMEOUTS.URL_WAIT_MS },
        );
        expect(page.url()).toContain(encodeURI(target.url));
      });
    }
  });
});
