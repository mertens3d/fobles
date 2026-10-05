import { expect, type Locator, type Page } from "../fixtures/playwright";
import {
  getButtonSize,
  moveMouseOutsideHoverArea,
  moveMouseToLocatorCenter,
} from "./mouse-proxy";
import { CONST } from "../CONST";
import type { MouseCoordinates } from "./mouse-proxy.types";
import { pauseForHuman } from "./wait-helpers";

const STEP_WAIT_MS =
  CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

export type HoverAndGrowOptions = {
  name: string;
  hoverTarget: Locator;
  measureTarget: Locator;
  moveAwayTargets: Locator | Locator[];
  mousePosition: MouseCoordinates;
};

export async function hoverAndGrow(
  page: Page,
  options: HoverAndGrowOptions,
): Promise<void> {
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    await pauseForHuman(page, STEP_WAIT_MS);
    const originalSize = await getButtonSize(options.measureTarget);
    await moveMouseToLocatorCenter(page, options.hoverTarget, options.name); // options.mousePosition,
    await pauseForHuman(page, STEP_WAIT_MS);
    await pauseForHuman(page, STEP_WAIT_MS); 
    const hoveredSize = await getButtonSize(options.measureTarget);
    expect(hoveredSize.width).toBeGreaterThan(originalSize.width);
    expect(hoveredSize.height).toBeGreaterThan(originalSize.height);
    console.log(`[fobles] ${options.name} grew on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.moveAwayTargets, options.mousePosition, `${options.name} away`);
    await pauseForHuman(page, STEP_WAIT_MS);
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
  mousePosition: MouseCoordinates;
};

export async function hoverAndSlideOut(
  page: Page,
  options: HoverAndSlideOutOptions,
): Promise<void> {
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    await moveMouseOutsideHoverArea(page, options.hoverRegion, options.mousePosition, `${options.name} away`);
    await pauseForHuman(page, STEP_WAIT_MS);
    await moveMouseToLocatorCenter(page, options.hoverTarget, options.name); // options.mousePosition,
    await pauseForHuman(page, STEP_WAIT_MS);
    await expect(options.flyoutTarget).toHaveAttribute("data-visible", "true");
    console.log(`[fobles] ${options.name} flyout opened on hover, cycle ${cycle}`);
    await moveMouseOutsideHoverArea(page, options.hoverRegion, options.mousePosition, `${options.name} away`);
    await pauseForHuman(page, STEP_WAIT_MS);
    await expect(options.flyoutTarget).toHaveAttribute("data-visible", "false");
    console.log(`[fobles] ${options.name} flyout closed after moving away, cycle ${cycle}`);
  }
}
