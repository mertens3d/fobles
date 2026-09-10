import { CONST } from "./CONST";
import { testLogger } from "../testLogger";
import {
  expect,
  type Frame,
  type Locator,
  type Page,
} from "./fixtures/playwright";

export type MousePosition = { x: number; y: number };

export async function getButtonSize(
  button: Locator,
): Promise<{ width: number; height: number }> {
  const box = await button.boundingBox();
  if (!box) throw new Error("Could not measure the hovered toolbar button");
  return { width: box.width, height: box.height };
}

export async function showMouseMarker(page: Page | Frame): Promise<void> {
  await page.evaluate((markerConfig) => {
    if (document.getElementById(markerConfig.ID)) return;

    const marker = document.createElement("div");
    marker.id = markerConfig.ID;
    marker.style.cssText = markerConfig.CSS_TEXT.join(";");
    document.documentElement.appendChild(marker);
  }, CONST.MARKER);
}

async function updateMouseMarkers(
  page: Page,
  x: number,
  y: number,
): Promise<void> {
  for (const frame of page.frames()) {
    const marker = frame.locator("#playwright-mouse-marker");
    if ((await marker.count()) === 0) continue;

    let localX = x;
    let localY = y;
    if (frame !== page.mainFrame()) {
      const frameBox = await frame.locator("html").boundingBox();
      if (!frameBox) continue;
      localX -= frameBox.x;
      localY -= frameBox.y;
    }

    await marker.evaluate(
      (element, coordinates) => {
        element.style.left = `${coordinates.x}px`;
        element.style.top = `${coordinates.y}px`;
      },
      { x: localX, y: localY },
    );
  }
}

export async function verifyMouseMarker(page: Page): Promise<void> {
  const markerState = await page
    .locator(`#${CONST.MARKER.ID}`)
    .evaluate((marker) => {
      const style = getComputedStyle(marker);
      const box = marker.getBoundingClientRect();
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
    });
  testLogger.debug("Mouse preflight initial marker", markerState);

  await page.mouse.move(100, 100);
  await page.evaluate(() => {
    const marker = document.getElementById("playwright-mouse-marker");
    if (marker) {
      marker.style.left = "100px";
      marker.style.top = "100px";
    }
  });
  await page.waitForTimeout(100);

  const movedState = await page
    .locator(`#${CONST.MARKER.ID}`)
    .evaluate((marker) => {
      const box = marker.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
    });
  testLogger.debug("Mouse preflight moved marker", movedState);
  expect(movedState.width).toBeGreaterThan(0);
  expect(movedState.height).toBeGreaterThan(0);
  expect(movedState.left).toBeGreaterThan(90);
  expect(movedState.top).toBeGreaterThan(90);
}

export async function moveMouseTo(
  page: Page,
  target: Locator,
  position: MousePosition,
  label: string,
): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error("Could not locate mouse target");

  testLogger.step(`Mouse target ${label}`, box);
  await moveMouseToPosition(
    page,
    {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    },
    position,
    label,
  );
}

export async function moveMouseToPosition(
  page: Page,
  targetPosition: MousePosition,
  position: MousePosition,
  label: string,
): Promise<void> {
  const startPosition = { ...position };
  const distance = Math.hypot(
    targetPosition.x - position.x,
    targetPosition.y - position.y,
  );
  const durationMs =
    (distance /
      (CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].MOUSE_PX_PER_SECOND *
        CONST.MOUSE.SPEED_MULTIPLIER)) *
    1_000;
  const stepDelay = 1_000 / CONST.MOUSE.UPDATE_HZ;
  const steps = Math.max(1, Math.ceil(durationMs / stepDelay));
  testLogger.step(
    `Mouse move ${label}: start=(${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}), end=(${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}), distance=${distance.toFixed(1)}px, steps=${steps}`,
  );

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const x = position.x + (targetPosition.x - position.x) * progress;
    const y = position.y + (targetPosition.y - position.y) * progress;
    await page.mouse.move(x, y);
    await updateMouseMarkers(page, x, y);
    await page.waitForTimeout(stepDelay);
  }

  position.x = targetPosition.x;
  position.y = targetPosition.y;
  testLogger.debug(
    `Mouse move ${label} ended at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`,
  );
}

export async function moveMouseOutsideHoverArea(
  page: Page,
  sources: Locator | Locator[],
  position: MousePosition,
  label: string,
): Promise<void> {
  const sourceList = Array.isArray(sources) ? sources : [sources];
  const sourceBoxes = (
    await Promise.all(sourceList.map((source) => source.boundingBox()))
  ).filter((box): box is NonNullable<typeof box> => box !== null);
  if (sourceBoxes.length === 0)
    throw new Error("Could not locate Foble hover region");

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
  testLogger.debug(`Hover region ${label}`, { sourceBoxes, sourceBox });

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  const candidates = [
    {
      x: sourceBox.x - CONST.MOUSE.HOVER_CLEARANCE_PX,
      y: center.y,
    },
    {
      x: sourceBox.x + sourceBox.width + CONST.MOUSE.HOVER_CLEARANCE_PX,
      y: center.y,
    },
    {
      x: center.x,
      y: sourceBox.y - CONST.MOUSE.HOVER_CLEARANCE_PX,
    },
    {
      x: center.x,
      y: sourceBox.y + sourceBox.height + CONST.MOUSE.HOVER_CLEARANCE_PX,
    },
  ].filter(
    (candidate) =>
      candidate.x >= 0 &&
      candidate.x <= viewport.width &&
      candidate.y >= 0 &&
      candidate.y <= viewport.height,
  );
  const targetPosition = candidates.reduce((closest, candidate) => {
    const candidateDistance = Math.hypot(
      candidate.x - center.x,
      candidate.y - center.y,
    );
    const closestDistance = Math.hypot(
      closest.x - center.x,
      closest.y - center.y,
    );
    return candidateDistance < closestDistance ? candidate : closest;
  });

  testLogger.step(
    `Hover boundary ${label}: outside ${JSON.stringify(sourceBox)} => (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  );
  await moveMouseToPosition(page, targetPosition, position, label);
}
