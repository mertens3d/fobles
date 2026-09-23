import { expect, type Locator, type Page } from "./fixtures/playwright";
import {
  getButtonSize,
  moveMouseOutsideHoverArea,
  moveMouseTo,
} from "./mouse-proxy";
import { CONST } from "./CONST";
import type { MousePosition } from "./mouse-proxy.types";

const STEP_WAIT_MS =
  CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

export type HoverAndGrowOptions = {
  name: string;
  hoverTarget: Locator;
  measureTarget: Locator;
  moveAwayTargets: Locator | Locator[];
  mousePosition: MousePosition;
};

export async function hoverAndGrow(
  page: Page,
  options: HoverAndGrowOptions,
): Promise<void> {
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    await page.waitForTimeout(STEP_WAIT_MS);
    const originalSize = await getButtonSize(options.measureTarget);
    await moveMouseTo(page, options.hoverTarget, options.mousePosition, options.name);
    await page.waitForTimeout(STEP_WAIT_MS);
    const hoveredSize = await getButtonSize(options.measureTarget);
    expect(hoveredSize.width).toBeGreaterThan(originalSize.width);
    expect(hoveredSize.height).toBeGreaterThan(originalSize.height);
    console.log(`[fobles] ${options.name} grew on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    await page.waitForTimeout(STEP_WAIT_MS);
    const restoredSize = await getButtonSize(options.measureTarget);
    expect(restoredSize.width).toBeCloseTo(originalSize.width, 1);
    expect(restoredSize.height).toBeCloseTo(originalSize.height, 1);
    console.log(`[fobles] ${options.name} shrank after moving away, cycle ${cycle}`);
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
    await page.waitForTimeout(STEP_WAIT_MS);
    await moveMouseTo(page, options.hoverTarget, options.mousePosition, options.name);
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(options.flyoutTarget).toHaveAttribute("data-visible", "true");
    console.log(`[fobles] ${options.name} flyout opened on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.hoverRegion, options.mousePosition, `${options.name} away`);
    await page.waitForTimeout(STEP_WAIT_MS);
    await expect(options.flyoutTarget).toHaveAttribute("data-visible", "false");
    console.log(`[fobles] ${options.name} flyout closed after moving away, cycle ${cycle}`);
  }
}
