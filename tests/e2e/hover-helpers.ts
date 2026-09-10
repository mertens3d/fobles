import { expect, type Locator, type Page } from "./fixtures/playwright";
import {
  getButtonSize,
  moveMouseOutsideHoverArea,
  moveMouseTo,
  type MousePosition,
} from "./mouse-proxy";
import { CONST } from "./CONST";
import { testLogger } from "../testLogger";

const STEP_WAIT_MS =
  CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

export type HoverAndGrowOptions = {
  name: string;
  hoverTarget: Locator;
  measureTarget: Locator;
  moveAwayTargets: Locator | Locator[];
  mousePosition: MousePosition;
};

export async function hoverOverMenuButton(
  page: Page,
  menuButton: Locator,
  menuFlyout: Locator,
  mousePosition: MousePosition,
  label: string,
): Promise<void> {
  testLogger.step(`Hover over menu trigger '${label}'`);
  await moveMouseTo(page, menuButton, mousePosition, label);
  testLogger.pause(STEP_WAIT_MS);
  await page.waitForTimeout(STEP_WAIT_MS);
  testLogger.waitFor("menu slide-out", CONST.TIMEOUTS.MENU_VISIBLE_MS);
  testLogger.step(`Validate menu triggered by '${label}' slid out`);
  await expect(menuFlyout).toHaveAttribute(
    CONST.ATTRIBUTES.MENU_VISIBLE,
    CONST.ATTRIBUTES.VALUE.TRUE,
  );
  testLogger.info(`Menu triggered by '${label}' slid out successfully`);
}

export async function hoverAndGrow(
  page: Page,
  options: HoverAndGrowOptions,
): Promise<void> {
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    testLogger.pause(STEP_WAIT_MS);
    await page.waitForTimeout(STEP_WAIT_MS);
    const originalSize = await getButtonSize(options.measureTarget);
    await moveMouseTo(page, options.hoverTarget, options.mousePosition, options.name);
    testLogger.pause(STEP_WAIT_MS);
    await page.waitForTimeout(STEP_WAIT_MS);
    const hoveredSize = await getButtonSize(options.measureTarget);
    expect(hoveredSize.width).toBeGreaterThan(originalSize.width);
    expect(hoveredSize.height).toBeGreaterThan(originalSize.height);
    testLogger.info(`${options.name} grew on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    testLogger.pause(STEP_WAIT_MS);
    await page.waitForTimeout(STEP_WAIT_MS);
    const restoredSize = await getButtonSize(options.measureTarget);
    expect(restoredSize.width).toBeCloseTo(originalSize.width, 1);
    expect(restoredSize.height).toBeCloseTo(originalSize.height, 1);
    testLogger.info(`${options.name} shrank after moving away, cycle ${cycle}`);
  }
}

export type HoverAndSlideOutOptions = {
  name: string;
  hoverTarget: Locator;
  flyoutTarget: Locator;
  hoverRegion: Locator | Locator[];
  mousePosition: MousePosition;
};

export async function hoverAndSlideOut(
  page: Page,
  options: HoverAndSlideOutOptions,
): Promise<void> {
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await moveMouseOutsideHoverArea(page, options.hoverRegion, options.mousePosition, `${options.name} away`);
    testLogger.pause(STEP_WAIT_MS);
    await page.waitForTimeout(STEP_WAIT_MS);
    await hoverOverMenuButton(
      page,
      options.hoverTarget,
      options.flyoutTarget,
      options.mousePosition,
      options.name,
    );
    testLogger.info(`${options.name} flyout opened on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.hoverRegion, options.mousePosition, `${options.name} away`);
    testLogger.pause(STEP_WAIT_MS);
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(options.flyoutTarget).toHaveAttribute(
      CONST.ATTRIBUTES.MENU_VISIBLE,
      CONST.ATTRIBUTES.VALUE.FALSE,
    );
    testLogger.info(`${options.name} flyout closed after moving away, cycle ${cycle}`);
  }
}
