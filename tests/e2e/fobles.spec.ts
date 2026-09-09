import {
  expect,
  test,
  type Page,
} from "./fixtures/playwright";
import { CONST } from "./CONST";
import {
  moveMouseOutsideHoverArea,
  moveMouseTo,
} from "./mouse-proxy";
import { activateFobles, activateFoblesForJumpTest } from "./fobles-helpers";
import { hoverAndGrow, hoverAndSlideOut } from "./hover-helpers";
import { showMouseMarker } from "./mouse-proxy";

const STEP_WAIT_MS =
  CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const TEST_CASES = CONST.SCENARIOS;

test.describe("Fobles browser integration", () => {
  for (const scenario of CONST.SCENARIOS) {
    test.skip(`${scenario.name} creates expected Fobles`, async ({ page }) => {
      await activateFobles(page, scenario);
      const featureButton = page
        .locator("button.foble-nav-feature-button")
        .first();
      const editorTabs = page.locator("#EditorTabs");
      await expect(editorTabs).toBeVisible();
      await showMouseMarker(page);

      const menuButton = page.locator(".fobles-quick-menu-trigger").first();
      await expect(menuButton).toBeVisible();
      const menuFlyout = page.locator(".fobles-quick-menu").first();
      const mousePosition = { x: 0, y: 0 };

      await hoverAndGrow(page, {
        name: "LBolt",
        hoverTarget: featureButton,
        measureTarget: featureButton,
        moveAwayTargets: featureButton,
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
      console.log("[fobles] Non-Foble #EditorTabs target clicked");

      for (const buttonName of scenario.expectedQuickInfoButtons) {
        await expect(
          page.getByRole("button", { name: buttonName, exact: true }).first(),
        ).toBeHidden();
      }
      console.log("[fobles] Quick-info Foble buttons dismissed");
    });
  }

  test("tree jump buttons navigate in the current tab", async ({ page }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    let foblesFrame = await activateFoblesForJumpTest(page, scenario);

    let menuButton = foblesFrame.locator(".fobles-quick-menu-trigger").first();
    let menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
    const mousePosition = { x: 0, y: 0 };

    await moveMouseTo(page, menuButton, mousePosition, "Tree jump menu");
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(menuFlyout).toHaveAttribute("data-visible", "true");

    console.log(
      "[fobles] About to look for tree-jump buttons in the open Menu flyout",
    );
    const treeJumpButtons = foblesFrame.locator("[data-foble-tree-jump-path]");
    const treeJumpPaths = await treeJumpButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-foble-tree-jump-path")),
    );
    const paths = treeJumpPaths.filter((path): path is string => path !== null);
    expect(paths.length).toBeGreaterThan(0);

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      await test.step(`Click "${path}"`, async () => {
        if (index > 0) {
          foblesFrame = await activateFoblesForJumpTest(page, scenario);
          menuButton = foblesFrame
            .locator(".fobles-quick-menu-trigger")
            .first();
          menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
          await moveMouseTo(page, menuButton, mousePosition, "Tree jump menu");
          await page.waitForTimeout(STEP_WAIT_MS);
          await expect(menuFlyout).toHaveAttribute("data-visible", "true");
        }

        const jumpButton = foblesFrame
          .locator("[data-foble-tree-jump-path]")
          .nth(index);
        await expect(jumpButton).toBeVisible();
        await jumpButton.scrollIntoViewIfNeeded();
        await moveMouseTo(
          page,
          jumpButton,
          mousePosition,
          `Tree jump ${index + 1}`,
        );
        await page.waitForTimeout(STEP_WAIT_MS);
        await jumpButton.click();

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(path)), {
            timeout: CONST.TIMEOUTS.URL_WAIT_MS,
          }),
          confirmationDialog.getByRole("button", { name: "Continue" }).click(),
        ]);

        const actualUrl = page.url();
        expect(actualUrl, `Expected current URL to contain ${path}`).toContain(
          encodeURI(path),
        );
        console.log(
          `[fobles] URL assertion: expected to contain ${path}; actual ${actualUrl}`,
        );
        await page.waitForTimeout(
          CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS *
            CONST.NAVIGATION.HOLD_MULTIPLIER,
        );
      });
    }
  });

  test("tree jump buttons open their target URL in a new tab with Ctrl+Click", async ({
    browserContext,
    page,
  }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    const foblesFrame = await activateFoblesForJumpTest(page, scenario);
    const menuButton = foblesFrame
      .locator(".fobles-quick-menu-trigger")
      .first();
    const menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
    const mousePosition = { x: 0, y: 0 };

    await moveMouseTo(page, menuButton, mousePosition, "Ctrl-click jump menu");
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(menuFlyout).toHaveAttribute("data-visible", "true");

    const treeJumpButtons = foblesFrame.locator("[data-foble-tree-jump-path]");
    const paths = await treeJumpButtons.evaluateAll((buttons) =>
      buttons
        .map((button) => button.getAttribute("data-foble-tree-jump-path"))
        .filter((path): path is string => path !== null),
    );
    expect(paths.length).toBeGreaterThan(0);

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      await test.step(`Ctrl+Click "${path}"`, async () => {
        const jumpButton = foblesFrame
          .locator("[data-foble-tree-jump-path]")
          .nth(index);

        await jumpButton.scrollIntoViewIfNeeded();
        await moveMouseTo(
          page,
          jumpButton,
          mousePosition,
          `Ctrl-click jump ${index + 1}`,
        );
        await page.waitForTimeout(STEP_WAIT_MS);

        const newTabPromise = browserContext.waitForEvent("page");
        await jumpButton.click({ modifiers: ["Control"] });
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
        await newTab.bringToFront();
        await newTab.waitForTimeout(newTabHoldMs);
        await page.bringToFront();
        await newTab.close();

        await moveMouseTo(
          page,
          menuButton,
          mousePosition,
          "Ctrl-click jump menu",
        );
        await page.waitForTimeout(STEP_WAIT_MS);
        await expect(menuFlyout).toHaveAttribute("data-visible", "true");
      });
    }
  });

  test("other menu buttons navigate to their configured URLs", async ({
    page,
  }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const scenario = TEST_CASES[0];
    let foblesFrame = await activateFoblesForJumpTest(page, scenario);
    let menuButton = foblesFrame.locator(".fobles-quick-menu-trigger").first();
    let menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
    const mousePosition = { x: 0, y: 0 };

    await moveMouseTo(page, menuButton, mousePosition, "Other menu buttons");
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(menuFlyout).toHaveAttribute("data-visible", "true");

    const menuButtons = foblesFrame.locator("[data-foble-menu-url]");
    const targets = await menuButtons.evaluateAll((buttons) =>
      buttons.map((button) => ({
        label: button.textContent?.trim() ?? "",
        url: button.getAttribute("data-foble-menu-url") ?? "",
      })),
    );
    expect(targets.length).toBeGreaterThan(0);
    const failures: string[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      try {
        await test.step(
          `Click "${target.label}"\nexpect URL to contain "${target.url}"`,
          async () => {
            try {
              if (index > 0) {
                foblesFrame = await activateFoblesForJumpTest(page, scenario);
                menuButton = foblesFrame
                  .locator(".fobles-quick-menu-trigger")
                  .first();
                menuFlyout = foblesFrame.locator(".fobles-quick-menu").first();
                await moveMouseTo(
                  page,
                  menuButton,
                  mousePosition,
                  "Other menu buttons",
                );
                await page.waitForTimeout(STEP_WAIT_MS);
                await expect(menuFlyout).toHaveAttribute(
                  "data-visible",
                  "true",
                );
              }

              const button = foblesFrame
                .locator("[data-foble-menu-url]")
                .nth(index);
              await expect(button).toBeVisible();
              await button.scrollIntoViewIfNeeded();
              await moveMouseTo(
                page,
                button,
                mousePosition,
                `Menu ${target.label}`,
              );
              await page.waitForTimeout(STEP_WAIT_MS);
              await button.click();

              const dialog = foblesFrame.getByRole("dialog");
              if (await dialog.isVisible().catch(() => false)) {
                await dialog.getByRole("button", { name: "Continue" }).click();
              }

              await page.waitForURL(
                (url) => url.toString().includes(encodeURI(target.url)),
                { timeout: CONST.TIMEOUTS.URL_WAIT_MS },
              );
              const actualUrl = page.url();
              await test.step(`actual: ${actualUrl}`, async () => {});
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
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              failures.push(
                `${target.label}\nexpect: ${target.url}\nactual: ${page.url()}\nerror: ${message}`,
              );
              console.error(
                `[fobles] Menu target failed; continuing: ${failures.at(-1)}`,
              );
            }
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
