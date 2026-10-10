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
import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import { attachItemPathScreenshot } from "../../helpers/fobles-helpers-support/navigation-assertions";
import { openContentEditor } from "../../fixtures/sitecore";
import { findFoblesFrame } from "../../helpers/frame-finder";
import {
  ClickFoblesJumpButton,
} from "../../macros/fobles-macros";
import { expectFoValue, } from "../../expect-snippets/expect-snippets";
import type { BrowserContext, Locator } from "@playwright/test";
import { clickFoblesNavigationButtonStep } from "../../helpers/click-navigate-helpers";
import type { TreeJumpDefinition } from "../../constants_partials/CONST.Types";
import { getTreeJumpFlyoutButton } from "../../helpers/element-finders";

foblesTest.describe("PageNavigation", () => {

  for (const treeJumpTarget of CONST.TESTING.TREE_JUMP_TARGETS) {

    foblesTest(`${treeJumpTarget.label}-Click`, async ({
      page, sharedBrowserContext
    }, testInfo) => {
      foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);

      const step = createFoblesStep(page, testInfo, page, "Tree Jump Click");

      await testOneClick(
        treeJumpTarget,
        step,
        page,
        testInfo,
        sharedBrowserContext,
      );
      // }
    });
  }
  for (const treeJumpTarget of CONST.TESTING.TREE_JUMP_TARGETS) {
    foblesTest(`${treeJumpTarget.label}-CtrlClick`, async ({
      sharedBrowserContext,
      page,
    }, testInfo) => {
      foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      const foblesFrame = await findFoblesFrame(page);

      await ClickFoblesJumpButton(page);
      const paths = await getExpectedButtonPaths(foblesFrame);
      await ClickFoblesJumpButton(page, false);

      const step = createFoblesStep(page, testInfo, page, "Ctrl+Click Jump");

      await TestOneCtrlClick(
        treeJumpTarget,
        step,
        sharedBrowserContext,
        page,
        testInfo);
    });
  }
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
  treeJumpTarget: TreeJumpDefinition,
  step: (
    title: string,
    body: (fullTitle: string) => Promise<void>,
    options?: { timeout?: number; screenshot?: boolean },
  ) => Promise<void>,
  page: Page,
  testInfo: TestInfo,
  sharedBrowserContext: BrowserContext,
) {
  
  await step(
    `Click: navigates to "${treeJumpTarget.clickNavigationExpect.foValue}"`,
    async () => {

      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      await ClickFoblesJumpButton(page);
      let foblesTreeButton: Locator | undefined;
      if (treeJumpTarget.clickNavigationExpect?.foValue) {
        foblesTreeButton = await getTreeJumpFlyoutButton(page, treeJumpTarget.clickNavigationExpect.foValue);
        await clickFoblesNavigationButtonStep(page, foblesTreeButton, testInfo, treeJumpTarget.clickNavigationExpect, "TODOAAA");
      } else {
        throw new Error(`Expected foValue not found for tree jump target: ${treeJumpTarget.label}`);
      }
    },
    { screenshot: false },
  );
}

async function TestOneCtrlClick(
  treeJumpTarget: TreeJumpDefinition,
  step: (
    title: string,
    body: (fullTitle: string) => Promise<void>,
    options?: { timeout?: number; screenshot?: boolean },
  ) => Promise<void>,
  sharedBrowserContext: BrowserContext,
  page: Page,
  testInfo: TestInfo,
) {
  const path = treeJumpTarget.clickNavigationExpect.foValue;
  await step(
    `Ctrl+Click: opens "${path}" in a new tab`,
    async () => {
      await ClickFoblesJumpButton(page);

      let foblesTreeButton: Locator | undefined;

      if (treeJumpTarget.clickNavigationExpect?.foValue) {
        foblesTreeButton = await getTreeJumpFlyoutButton(page, treeJumpTarget.clickNavigationExpect.foValue);

        const newTabPromise = sharedBrowserContext.waitForEvent("page");
        await clickWithMouseMarker(
          page,
          foblesTreeButton,
          `Ctrl-click jump ${treeJumpTarget.label}`,
          {
            modifiers: ["Control"],
          },
        );
        const newTab = await newTabPromise;
        await newTab.waitForLoadState("domcontentloaded").catch(() => undefined);

        expectFoValue(newTab, treeJumpTarget.clickNavigationExpect.foValue);

        const newTabHoldMs =
          CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
          CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;

        await attachItemPathScreenshot(newTab, testInfo, treeJumpTarget.clickNavigationExpect.foValue);
        await bringPageToFront(newTab, newTabHoldMs);
        await bringPageToFront(page);
        await newTab.close();
      } else {
        // Handle the case where the expected foValue is not found
        throw new Error(`Expected foValue not found for tree jump target: ${treeJumpTarget.label}`);
      }
    },
    { screenshot: false },
  );
}
