import { type Locator, type Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { pulseMouseMarkerClick } from "./mouse-marker";
import { moveMouseToPosition } from "./mouse-movement";
import type { MouseCoordinates } from "../mouse-proxy.types";
import type { HighlightStyle } from "../../constants/CONST.Types";

export async function getButtonSize(button: Locator): Promise<{ width: number; height: number }> {
  const box = await button.boundingBox();
  if (!box) throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.COULD_NOT_MEASURE_BUTTON);
  return { width: box.width, height: box.height };
}

export async function clickWithMouseMarker(
  page: Page,
  targetLocator: Locator,
  label: string,
  options?: {
    modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
    clickCount?: number;
    corner?: "center" | "top-left";
  },
): Promise<void> {
  console.log(`[fobles] clickWithMouseMarker '${label}' options: ${JSON.stringify(options)}`);

  if (!page) console.error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.PAGE_NOT_DEFINED);
  if (!(await targetLocator.isVisible())) {
    const message = `${CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.TARGET_NOT_VISIBLE_PREFIX}${label}`;
    console.error(message);
    throw new Error(message);
  }
  if (!label) console.error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.LABEL_NOT_DEFINED);

  const corner = options?.corner ?? CONST.TESTING.MOUSE_PROXY.CORNER.CENTER;
  await highlightClick(targetLocator, `${label} - ${clickWithMouseMarker.name}`);
  await moveMouseToBoundingBox(page, targetLocator, label, corner);
  await pulseMouseMarkerClick(page);
  await targetLocator.click({
    modifiers: options?.modifiers,
    clickCount: options?.clickCount,
    position: corner === CONST.TESTING.MOUSE_PROXY.CORNER.TOP_LEFT ? { x: 0, y: 0 } : undefined,
  });
}

export async function moveMouseToBoundingBox(
  page: Page,
  targetLocator: Locator,
  label: string,
  corner: "center" | "top-left" = CONST.TESTING.MOUSE_PROXY.CORNER.CENTER,
): Promise<void> {
  console.log(`[fobles] S) moveMouseToBoundingBox '${label}'`);
  if (!targetLocator) {
    console.error(`${CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.TARGET_NOT_PROVIDED_PREFIX}${label}'`);
    throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.NO_MOUSE_TARGET_PROVIDED);
  }

  if (!(await targetLocator.isVisible())) {
    console.error(`${CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.TARGET_NOT_VISIBLE_PREFIX}${label}`);
    throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.MOUSE_TARGET_NOT_VISIBLE);
  }
  await highlightClick(targetLocator, label);

  const box = await targetLocator.boundingBox();
  if (!box) {
    console.error(`${CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.COULD_NOT_GET_BOUNDING_BOX} '${label}'`);
    throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.COULD_NOT_GET_BOUNDING_BOX);
  }

  const targetPosition = corner === CONST.TESTING.MOUSE_PROXY.CORNER.TOP_LEFT
    ? { x: box.x, y: box.y }
    : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await moveMouseToPosition(page, targetPosition, label);
  console.log(`[fobles] E) Mouse move to '${label}' called`);
}

export async function highlightScreenShot(target: Locator, label: string): Promise<void> {
  await highlightBase(target, `${label} - ${highlightScreenShot.name}`, CONST.TESTING.MOUSE_PROXY.HIGHLIGHT.STYLES.SCREEN_SHOT);
}


export async function highlightClick(target: Locator, label: string): Promise<void> {
  await highlightBase(target, label, CONST.TESTING.MOUSE_PROXY.HIGHLIGHT.STYLES.CLICK);
}

async function highlightBase(target: Locator, label: string, highlightStyle: HighlightStyle): Promise<void> {
  const count = await target.count();
  if (count === 0) {
    console.warn(`[fobles] Highlight skipped: '${label}' matched 0 elements`);
    return;
  }
  if (count > 1) {
    console.warn(`[fobles] '${label}' matched ${count} elements, using first match`);
  }

  const highlightedTarget = target.first();
  console.log(`[fobles] Highlighting locator '${label}'`);
  const original = await highlightedTarget.evaluate((element) => {
    const el = element as HTMLElement;
    return {
      color: el.style.color,
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      backgroundColor: el.style.backgroundColor,
      transition: el.style.transition,
    };
  });

  await highlightedTarget.evaluate((element, highlight: HighlightStyle) => {
    const el = element as HTMLElement;
    el.style.transition = highlight.TRANSITION;
    el.style.outline = highlight.OUTLINE;
    // el.style.color = highlight.COLOR;
    el.style.outlineOffset = highlight.OUTLINE_OFFSET;
    //el.style.backgroundColor = highlight.BACKGROUND_COLOR;
  }, highlightStyle);
  await highlightedTarget.page().waitForTimeout(CONST.TESTING.MOUSE_PROXY.HIGHLIGHT.VISIBLE_DELAY_MS);

  void setTimeout(() => {
    highlightedTarget
      .evaluate((element, originalStyles) => {
        const el = element as HTMLElement;
        el.style.outline = originalStyles.outline;
        el.style.outlineOffset = originalStyles.outlineOffset;
        //el.style.backgroundColor = originalStyles.backgroundColor;
        el.style.transition = originalStyles.transition;
      }, original)
      .catch(() => {
        console.error(`[fobles] Failed to restore original styles for '${label}'`);
      });
  }, CONST.TESTING.MOUSE_PROXY.HIGHLIGHT.RESTORE_DELAY_MS);
}

export async function moveMouseToLocatorCenter(
  page: Page,
  targetLocator: Locator,
  label: string,
): Promise<void> {
  await moveMouseToBoundingBox(page, targetLocator, label, CONST.TESTING.MOUSE_PROXY.CORNER.CENTER);
}

export async function moveMouseOutsideHoverArea(
  page: Page,
  sources: Locator | Locator[],
  position: MouseCoordinates,
  label: string,
): Promise<void> {
  const sourceList = Array.isArray(sources) ? sources : [sources];
  const sourceBoxes = (
    await Promise.all(sourceList.map((source) => source.boundingBox()))
  ).filter((box): box is NonNullable<typeof box> => box !== null);
  if (sourceBoxes.length === 0) {
    throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.COULD_NOT_LOCATE_HOVER_REGION);
  }

  const sourceBox = {
    x: Math.min(...sourceBoxes.map((box) => box.x)),
    y: Math.min(...sourceBoxes.map((box) => box.y)),
    width:
      Math.max(...sourceBoxes.map((box) => box.x + box.width)) -
      Math.min(...sourceBoxes.map((box) => box.x)),
    height:
      Math.max(...sourceBoxes.map((box) => box.y + box.height)) -
      Math.min(...sourceBoxes.map((box) => box.y)),
  };
  console.log(
    `[fobles] Hover region ${label}: ${JSON.stringify(sourceBoxes)} => ${JSON.stringify(sourceBox)}`,
  );

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  const clearance = CONST.TESTING.MOUSE.HOVER_CLEARANCE_PX;
  const candidates = [
    { x: sourceBox.x - clearance, y: center.y },
    { x: sourceBox.x + sourceBox.width + clearance, y: center.y },
    { x: center.x, y: sourceBox.y - clearance },
    { x: center.x, y: sourceBox.y + sourceBox.height + clearance },
  ].filter(
    (candidate) =>
      candidate.x >= 0 && candidate.x <= viewport.width &&
      candidate.y >= 0 && candidate.y <= viewport.height,
  );
  const targetPosition = candidates.reduce((closest, candidate) => {
    const candidateDistance = Math.hypot(candidate.x - center.x, candidate.y - center.y);
    const closestDistance = Math.hypot(closest.x - center.x, closest.y - center.y);
    return candidateDistance < closestDistance ? candidate : closest;
  }, position);

  console.log(
    `[fobles] Hover boundary ${label}: outside ${JSON.stringify(sourceBox)} => (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  );
  await moveMouseToPosition(page, targetPosition, label);
}
