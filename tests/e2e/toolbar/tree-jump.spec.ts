import {
  expect,
  foblesTest,
  type Frame,
  type Page,
  type TestInfo,
} from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { clickWithMouseMarker } from "../../helpers/mouse-proxy";
import { bringPageToFront } from "../../helpers/page-switch";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import { attachItemPathScreenshot } from "../../helpers/fobles-helpers-support/navigation-assertions";
import { openContentEditor } from "../../fixtures/sitecore";
import { findFoblesFrame } from "../../helpers/frame-finder";
import {
  ClickFoblesJumpButton,
} from "../../macros/fobles-macros";
import {
  expectCurrentUrl,
} from "../../expect-snippets/expect-snippets";
import type { BrowserContext, Locator } from "@playwright/test";
import { getJumpFlyoutButton } from "../../helpers/scrolling-helpers";
import { clickFoblesNavigationButton } from "../../helpers/click-navigate-helpers";

foblesTest.describe("Fobles browser integration", () => {
  foblesTest("tree jump buttons navigate in the current tab", async ({
    page,
  }, testInfo) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
    let foblesFrame = await findFoblesFrame(page);

    await ClickFoblesJumpButton(page);

    const paths = await getExpectedButtonPaths(foblesFrame);

    const step = createStep(page, testInfo, page, "Tree Jump Click");

    for (let index = 0; index < paths.length; index += 1) {
      foblesFrame = await testOneClick(
        paths,
        index,
        step,
        foblesFrame,
        page,
        testInfo,
      );
    }
  });

  foblesTest("tree jump buttons open their target URL in a new tab with Ctrl+Click", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
    const foblesFrame = await findFoblesFrame(page);

    await ClickFoblesJumpButton(page);
    const paths = await getExpectedButtonPaths(foblesFrame);
    await ClickFoblesJumpButton(page, false);

    const step = createStep(page, testInfo, page, "Ctrl+Click Jump");

    for (let index = 0; index < paths.length; index += 1) {
      await TestOneCtrlClick(
        paths,
        index,
        step,
        foblesFrame,
        sharedBrowserContext,
        page,
        testInfo,
      );
      //await clickWithMouseMarker(page, jumpFlyoutButton, "Ctrl-click jump flyout");
      //await expectFlyoutVisible(foblesFrame);
    }
  });
});

async function getExpectedButtonPaths(foblesFrame: Frame): Promise<string[]> {
  console.log(
    "[fobles] About to look for tree-jump buttons in the open Menu flyout",
  );
  const treeJumpButtons = foblesFrame.locator(
    CONST.FOBLES.SELECTORS.DATA.FOBLES_TREE_JUMP_PATH,
  );
  console.log(
    "Looking for tree jump path attribute:",
    CONST.FOBLES.ATTRIBUTES.TREE_JUMP_PATH,
  );
  const attr = CONST.FOBLES.ATTRIBUTES.TREE_JUMP_PATH;

const paths = await treeJumpButtons.evaluateAll(
  (buttons, attr) => {
    return buttons
      .map((button) => button.getAttribute(attr))
      .filter((path): path is string => path !== null);
  },
  attr
);

  expect(paths.length).toBeGreaterThan(0);
  return paths;
}

async function testOneClick(
  paths: string[],
  index: number,
  step: (
    title: string,
    body: (fullTitle: string) => Promise<void>,
    options?: { timeout?: number; screenshot?: boolean },
  ) => Promise<void>,
  foblesFrame: Frame,
  page: Page,
  testInfo: TestInfo,
) {
  const path = paths[index];
  await step(
    `Click: navigates to "${path}"`,
    async () => {
      if (index > 0) {
        await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
        foblesFrame = await findFoblesFrame(page);
        await ClickFoblesJumpButton(page);
      }

      const flyoutButton :Locator= await getJumpFlyoutButton(
        foblesFrame,
        index,
      );

      await clickFoblesNavigationButton(page, flyoutButton,  path, testInfo);
      
    },
    { screenshot: false },
  );
  return foblesFrame;
}





async function TestOneCtrlClick(
  paths: string[],
  index: number,
  step: (
    title: string,
    body: (fullTitle: string) => Promise<void>,
    options?: { timeout?: number; screenshot?: boolean },
  ) => Promise<void>,
  foblesFrame: Frame,
  sharedBrowserContext: BrowserContext,
  page: Page,
  testInfo: TestInfo,
) {
  const path = paths[index];
  await step(
    `Ctrl+Click: opens "${path}" in a new tab`,
    async () => {
      await ClickFoblesJumpButton(page);


      const foblesTreeButton = await getJumpFlyoutButton(
        foblesFrame,
        index,
      );

      const newTabPromise = sharedBrowserContext.waitForEvent("page");
      await clickWithMouseMarker(
        page,
        foblesTreeButton,
        `Ctrl-click jump ${index + 1}`,
        {
          modifiers: ["Control"],
        },
      );
      const newTab = await newTabPromise;
      await newTab.waitForLoadState("domcontentloaded").catch(() => undefined);

      expectCurrentUrl(newTab, path);

      const newTabHoldMs =
        CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
        CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;

      await attachItemPathScreenshot(newTab, testInfo, path);
      await bringPageToFront(newTab, newTabHoldMs);
      await bringPageToFront(page);
      await newTab.close();
    },
    { screenshot: false },
  );
}
