import {
  expect,
  test,
  type Frame,
  type Page,
  type TestInfo,
} from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import {
  clickWithMouseMarker,
} from "../../helpers/mouse-proxy";
import { openSitecorePageAndFindFoblesFrame, attachItemPathScreenshot, createStep } from "../../helpers/fobles-helpers";
import { ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { ClickFoblesMenuButton, dismissFoblesConfirmDialogIfPresent } from "../../macros/fobles-macros";
import { expectCurrentUrl, expectFlyoutVisible } from "../../expectSnippets/expectSnippets";
import { bringPageToFront } from "../../helpers/page-switch";
import type { BrowserContext } from "@playwright/test";

test.describe("Fobles browser integration", () => {

  test("tree jump buttons navigate in the current tab", async ({ page }, testInfo) => {
    test.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    let foblesFrame = await openSitecorePageAndFindFoblesFrame(page);

    await ClickFoblesMenuButton(page);
    await expectFlyoutVisible(foblesFrame);

    const paths = await getExpectedButtonPaths(foblesFrame);

    const step = createStep(page, testInfo, page, "Tree Jump");

    for (let index = 0; index < paths.length; index += 1) {
      foblesFrame = await testOneClick(paths, index, step, foblesFrame, page, testInfo);
    }
  });

  test("tree jump buttons open their target URL in a new tab with Ctrl+Click", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    test.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const foblesFrame = await openSitecorePageAndFindFoblesFrame(page);

    await ClickFoblesMenuButton(page);
    await expectFlyoutVisible(foblesFrame);
    const paths = await getExpectedButtonPaths(foblesFrame);

    const step = createStep(page, testInfo, page, "Ctrl+Click Jump");

    for (let index = 0; index < paths.length; index += 1) {

      await TestOnCtrlClick(paths, index, step, foblesFrame, sharedBrowserContext, page, testInfo);
      //await clickWithMouseMarker(page, menuButton, "Ctrl-click jump menu");
      //await expectFlyoutVisible(foblesFrame);
    }
  });


});

async function getExpectedButtonPaths(foblesFrame: Frame) {
  console.log(
    "[fobles] About to look for tree-jump buttons in the open Menu flyout"
  );
  const treeJumpButtons = foblesFrame.locator(CONST.FOBLES.SELECTORS.TREE_JUMP_BUTTON);
  const paths = await treeJumpButtons.evaluateAll((buttons) => buttons
    .map((button) => button.getAttribute("data-fobles-tree-jump-path"))
    .filter((path): path is string => path !== null)
  );

  expect(paths.length).toBeGreaterThan(0);
  return paths;
}

async function testOneClick(paths: string[], 
          index: number, 
          step: (title: string, 
                  body: (fullTitle: string) => Promise<void>, 
                  options?: { timeout?: number; screenshot?: boolean; }) => Promise<void>, 
                  foblesFrame: Frame, 
                  page: Page, 
                  testInfo: TestInfo) {
  const path = paths[index];
  await step(`Click: navigates to "${path}"`, async () => {

    if (index > 0) {
      foblesFrame = await openSitecorePageAndFindFoblesFrame(page);
      await ClickFoblesMenuButton(page);
      await expectFlyoutVisible(foblesFrame);
    }

    const foblesTreeButton = await ScrollFoblesTreeButtonIntoView(foblesFrame, index);

    await clickWithMouseMarker(page, foblesTreeButton, `Tree jump ${index + 1}`);
    await dismissFoblesConfirmDialogIfPresent(page);

    await ensureMouseMarkerExists(page);
    expectCurrentUrl(page, path);

    await attachItemPathScreenshot(page, testInfo, path);
    await page.waitForTimeout(
      CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
      CONST.TESTING.NAVIGATION.HOLD_MULTIPLIER
    );
  }, { screenshot: false });
  return foblesFrame;
}



async function ScrollFoblesTreeButtonIntoView(foblesFrame: Frame, index: number) {
  const foblesTreeButton = foblesFrame
    .locator(CONST.FOBLES.SELECTORS.TREE_JUMP_BUTTON)
    .nth(index);
  await expect(foblesTreeButton).toBeVisible();
  await foblesTreeButton.scrollIntoViewIfNeeded();
  return foblesTreeButton;
}

async function TestOnCtrlClick(paths: string[], index: number, step: (title: string, body: (fullTitle: string) => Promise<void>, options?: { timeout?: number; screenshot?: boolean; }) => Promise<void>, foblesFrame: Frame, sharedBrowserContext: BrowserContext, page: Page, testInfo: TestInfo) {
  const path = paths[index];
  await step(`Ctrl+Click: opens "${path}" in a new tab`, async () => {


    await ClickFoblesMenuButton(page);
    await expectFlyoutVisible(foblesFrame);

    const foblesTreeButton = await ScrollFoblesTreeButtonIntoView(foblesFrame, index);

    const newTabPromise = sharedBrowserContext.waitForEvent("page");
    await clickWithMouseMarker(page, foblesTreeButton, `Ctrl-click jump ${index + 1}`, {
      modifiers: ["Control"],
    });
    const newTab = await newTabPromise;
    await newTab
      .waitForLoadState("domcontentloaded")
      .catch(() => undefined);


    expectCurrentUrl(newTab, path);


    const newTabHoldMs = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
      CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;

    await attachItemPathScreenshot(newTab, testInfo, path);
    await bringPageToFront(newTab, newTabHoldMs);
    await bringPageToFront(page);
    await newTab.close();


  }, { screenshot: false });
}

