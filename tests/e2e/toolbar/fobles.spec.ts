import {
  expect,
  test,
  type Page,
} from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  clickWithMouseMarker,
  getLastKnownMousePosition,
  moveMouseOutsideHoverArea,
  moveMouseTo,
} from "../mouse-proxy";
import { activateFobles, openSitecorePageAndFindFoblesFrame, attachItemPathScreenshot, createStep } from "../fobles-helpers";
import { clickRibbonTab, dismissFoblesConfirmDialogIfPresent } from "../sitecore-macros";
import { hoverAndGrow, hoverAndSlideOut } from "../hover-helpers";
import { showMouseMarker } from "../mouse-proxy";
import { findFrameWithSelector } from "../frame-finder";

const TEST_CASES = CONST.SCENARIOS;

test.describe("Fobles browser integration", () => {
  for (const scenario of CONST.SCENARIOS) {
    test.skip(`${scenario.name} creates expected Fobles`, async ({ page }) => {
      await activateFobles(page, scenario);
      const lboltButton = page
        .locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON)
        .first();
      const editorTabs = page.locator("#EditorTabs");
      await expect(editorTabs).toBeVisible();
      await showMouseMarker(page);

      const menuButton = page.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
      await expect(menuButton).toBeVisible();
      const menuFlyout = page.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
      const mousePosition = getLastKnownMousePosition();

      await hoverAndGrow(page, {
        name: "LBolt",
        hoverTarget: lboltButton,
        measureTarget: lboltButton,
        moveAwayTargets: lboltButton,
        mousePosition,
      });

      await hoverAndSlideOut(page, {
        name: "Menu",
        hoverTarget: menuButton,
        flyoutTarget: menuFlyout,
        hoverRegion: [menuButton, menuFlyout],
        mousePosition,
      });

      await moveMouseOutsideHoverArea(
        page,
        [menuButton, menuFlyout],
        mousePosition,
        "Menu away",
      );
      await editorTabs.click();
      console.log("[fobles] Non-Fobles #EditorTabs target clicked");

      for (const buttonName of scenario.expectedQuickInfoButtons) {
        await expect(
          page.getByRole("button", { name: buttonName, exact: true }).first(),
        ).toBeHidden();
      }
      console.log("[fobles] Quick-info Fobles buttons dismissed");
    });
  }

  test("tree jump buttons navigate in the current tab", async ({ page }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    let foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);

    let menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
    let menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();

    await clickWithMouseMarker(page, menuButton, "Tree jump menu");
    await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

    console.log(
      "[fobles] About to look for tree-jump buttons in the open Menu flyout",
    );
    const treeJumpButtons = foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON);
    const treeJumpPaths = await treeJumpButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-fobles-tree-jump-path")),
    );
    const paths = treeJumpPaths.filter((path): path is string => path !== null);
    expect(paths.length).toBeGreaterThan(0);
    const step = createStep(page, testInfo, page, "Tree Jump");

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      await step(`Click: navigates to "${path}"`, async () => {
        if (index > 0) {
          foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);
          menuButton = foblesFrame
            .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
            .first();
          menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
          await clickWithMouseMarker(page, menuButton, "Tree jump menu");
          await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");
        }

        const jumpButton = foblesFrame
          .locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON)
          .nth(index);
        await expect(jumpButton).toBeVisible();
        await jumpButton.scrollIntoViewIfNeeded();
        await clickWithMouseMarker(page, jumpButton, `Tree jump ${index + 1}`);

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(path)), {
            timeout: CONST.TIMEOUTS.URL_WAIT_MS,
          }),
          clickWithMouseMarker(
            page,
            confirmationDialog.getByRole("button", { name: CONST.SITECORE.LABELS.CONTINUE_BUTTON }),
            "Confirm dialog Continue",
          ),
        ]);

        const actualUrl = page.url();
        expect(actualUrl, `Expected current URL to contain ${path}`).toContain(
          encodeURI(path),
        );
        console.log(
          `[fobles] URL assertion: expected to contain ${path}; actual ${actualUrl}`,
        );
        await attachItemPathScreenshot(page, testInfo, path);
        await page.waitForTimeout(
          CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS *
            CONST.NAVIGATION.HOLD_MULTIPLIER,
        );
      }, { screenshot: false });
    }
  });

  test("tree jump buttons open their target URL in a new tab with Ctrl+Click", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    const foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);
    const menuButton = foblesFrame
      .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
      .first();
    const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();

    await clickWithMouseMarker(page, menuButton, "Ctrl-click jump menu");
    await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

    const treeJumpButtons = foblesFrame.locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON);
    const paths = await treeJumpButtons.evaluateAll((buttons) =>
      buttons
        .map((button) => button.getAttribute("data-fobles-tree-jump-path"))
        .filter((path): path is string => path !== null),
    );
    expect(paths.length).toBeGreaterThan(0);
    const step = createStep(page, testInfo, page, "Ctrl+Click Jump");

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      await step(`Ctrl+Click: opens "${path}" in a new tab`, async () => {
        const jumpButton = foblesFrame
          .locator(CONST.SITECORE.SELECTORS.TREE_JUMP_BUTTON)
          .nth(index);

        await jumpButton.scrollIntoViewIfNeeded();

        const newTabPromise = sharedBrowserContext.waitForEvent("page");
        await clickWithMouseMarker(page, jumpButton, `Ctrl-click jump ${index + 1}`, {
          modifiers: ["Control"],
        });
        const newTab = await newTabPromise;
        await newTab
          .waitForLoadState("domcontentloaded")
          .catch(() => undefined);

        const actualUrl = newTab.url();
        expect(actualUrl, `Expected new-tab URL to contain ${path}`).toContain(
          encodeURI(path),
        );
        const newTabHoldMs =
          CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS *
          CONST.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;
        console.log(
          `[fobles] URL assertion: expected new tab to contain ${path}; actual ${actualUrl}`,
        );
        await attachItemPathScreenshot(newTab, testInfo, path);
        await newTab.bringToFront();
        await newTab.waitForTimeout(newTabHoldMs);
        await page.bringToFront();
        await newTab.close();

        await clickWithMouseMarker(page, menuButton, "Ctrl-click jump menu");
        await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");
      }, { screenshot: false });
    }
  });

  test("other menu buttons navigate to their configured URLs", async ({
    page,
  }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    let foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);
    let menuButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();
    let menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
    const step = createStep(page, testInfo, page, "Menu Button");

    await clickWithMouseMarker(page, menuButton, "Other menu buttons");
    await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");

    const menuButtons = foblesFrame.locator("[data-fobles-menu-url]");
    const targets = await menuButtons.evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: button.textContent?.trim() ?? "",
        url: button.getAttribute("data-fobles-menu-url") ?? "",
      })),
    );
    expect(targets.length).toBeGreaterThan(0);
    const failures: string[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      try {
        await step(
          `Click "${target.label}": URL contains "${target.url}"`,
          async () => {
            if (index > 0) {
              foblesFrame = await openSitecorePageAndFindFoblesFrame(page, scenario);
              menuButton = foblesFrame
                .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
                .first();
              menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
              await clickWithMouseMarker(page, menuButton, "Other menu buttons");
              await expect(menuFlyout).toHaveAttribute(
                CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE,
                "true",
              );
            }

            const button = foblesFrame
              .locator("[data-fobles-menu-url]")
              .nth(index);
            await expect(button).toBeVisible();
            await button.scrollIntoViewIfNeeded();
            await clickWithMouseMarker(page, button, `Menu ${target.label}`);

            await dismissFoblesConfirmDialogIfPresent(page);

            await page.waitForURL(
              (url) => url.toString().includes(encodeURI(target.url)),
              { timeout: CONST.TIMEOUTS.URL_WAIT_MS },
            );
            // waitForURL only confirms the URL changed, not that the new page has actually
            // painted - without this, the step's auto screenshot can capture a stale composited
            // frame from the page being navigated away from instead of the new one.
            await page.waitForLoadState("load").catch(() => undefined);

            // Content Editor's ribbon can be left on whatever tab a previous session used -
            // normalize to Home before the screenshot so it's consistent regardless.
            if (target.label === "Content Editor") {
              await findFrameWithSelector(page, 'a[accesskey="H"]', "Content Editor Home ribbon tab")
                .then((frame) => clickRibbonTab(page, frame, "H"))
                .catch(() => undefined);
            }

            const actualUrl = page.url();
            expect(
              actualUrl,
              `Expected current URL to contain ${target.url}`,
            ).toContain(encodeURI(target.url));
            console.log(
              `[fobles] URL assertion: expected ${target.url}; actual ${actualUrl}`,
            );
            await page.waitForTimeout(
              CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS *
                CONST.NAVIGATION.HOLD_MULTIPLIER,
            );
          },
          { timeout: CONST.TIMEOUTS.STEP_TIMEOUT_MS },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failure = `${target.label}\nexpect: ${target.url}\nactual: ${page.url()}\nerror: ${message}`;
        failures.push(failure);
        console.error(
          `[fobles] FAILED STEP TIMEOUT/ERROR; continuing: ${failure}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(`Menu target failures:\n${failures.join("\n")}`);
    }
  });
});
