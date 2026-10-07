import type { Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { showBillboard } from "../billboard";
import { pauseForHuman } from "../wait-helpers";
import type { CornerPosition, MouseCoordinates } from "../mouse-proxy.types";
import {
  getLastKnownMousePosition,
  isSprintMode,
  setLastKnownMousePosition,
} from "./mouse-proxy-state";
import { updateMouseMarkers } from "./mouse-marker";
import { drawMousePath, updateMousePath } from "./mouse-path";

export function resolveCornerPosition(
  page: Page,
  cornerPosition: CornerPosition,
): MouseCoordinates {
  const viewport = page.viewportSize();
  if (!viewport)
    throw new Error(
      CONST.TESTING.MOUSE.PROXY.ERROR_MESSAGES.COULD_NOT_READ_VIEWPORT,
    );

  const x = cornerPosition.corner.endsWith("right")
    ? viewport.width - cornerPosition.offsetX
    : cornerPosition.offsetX;
  const y = cornerPosition.corner.startsWith("bottom")
    ? viewport.height - cornerPosition.offsetY
    : cornerPosition.offsetY;
  return { x, y };
}

export async function moveMouseToPosition(
  page: Page,
  targetPosition: MouseCoordinates,
  label: string,
): Promise<void> {
  // console.log(`[fobles] S) Mouse move '${label}' `);
  const initialPosition = getLastKnownMousePosition();

  if (isSprintMode()) {
    // console.log(`[fobles] Mouse sprint mode: moving directly to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
    await page.mouse.move(targetPosition.x, targetPosition.y);
    setLastKnownMousePosition(targetPosition);
    return;
  }

  const { mouseSteps, mouseStepDelay, mouseDurationMs } = calculateTotalMouseSteps(
    targetPosition,
    initialPosition,
    label,
  );

  await drawMousePath(page, initialPosition, targetPosition);

  for (let mouseStep = 1; mouseStep <= mouseSteps; mouseStep += 1) {
    const progress = mouseStep / mouseSteps;
    const x =
      initialPosition.x + (targetPosition.x - initialPosition.x) * progress;
    const y =
      initialPosition.y + (targetPosition.y - initialPosition.y) * progress;
    await page.mouse.move(x, y);
    await updateMouseMarkers(page, x, y);
    await updateMousePath(page, progress);
    await pauseForHuman(page, mouseStepDelay, true);
  }

  setLastKnownMousePosition(targetPosition);
  // console.log(
  //   `[fobles] E) Mouse move '${label}' ended at (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  // );
}

function calculateTotalMouseSteps(
  targetPosition: MouseCoordinates,
  initialPosition: MouseCoordinates,
  label: string,
) {
  console.log(
    `[fobles] Mouse normal mode: moving to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  );
  const distance = Math.hypot(
    targetPosition.x - initialPosition.x,
    targetPosition.y - initialPosition.y,
  );
  const durationMs =
    (distance /
      (CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED]
        .MOUSE_PX_PER_SECOND *
        CONST.TESTING.MOUSE.ROOT.SPEED_MULTIPLIER)) *
    1000;
  const mouseStepDelay = 1000 / CONST.TESTING.MOUSE.ROOT.UPDATE_HZ;
  const mouseSteps = Math.max(1, Math.ceil(durationMs / mouseStepDelay));
  // console.log(
  //   `[fobles] Mouse move '${label}': start=(${initialPosition.x.toFixed(1)}, ${initialPosition.y.toFixed(1)}), end=(${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}), distance=${distance.toFixed(1)}px, steps=${mouseSteps}`
  // );

const mouseDurationMs = mouseSteps * mouseStepDelay;

  return { mouseSteps, mouseStepDelay, mouseDurationMs };
}

export async function moveMouseToDefault(page: Page): Promise<void> {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await showBillboard(
    page,
    CONST.TESTING.MOUSE.PROXY.DEFAULT_LABELS.MOUSE_TO_DEFAULT,
  );
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  await moveMouseToPosition(
    page,
    center,
    CONST.TESTING.MOUSE.PROXY.DEFAULT_LABELS.CENTER_OF_MONITOR,
  );
}

export async function moveMouseTowardCenter(
  page: Page,
  distancePx = 100,
): Promise<void> {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const current = getLastKnownMousePosition();

  if (!current) {
    await moveMouseToDefault(page);
    return;
  }

  const center = {
    x: viewport.width / 2,
    y: viewport.height / 2,
  };

  const dx = center.x - current.x;
  const dy = center.y - current.y;
  const length = Math.hypot(dx, dy);

  const target =
    length <= distancePx
      ? center
      : {
          x: current.x + (dx / length) * distancePx,
          y: current.y + (dy / length) * distancePx,
        };

  await moveMouseToPosition(page, target, `${distancePx}px toward center`);
}
