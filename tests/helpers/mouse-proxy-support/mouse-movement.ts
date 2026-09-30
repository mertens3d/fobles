import type { Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { showBillboard } from "../billboard";
import { foblesWaitForTimeout } from "../wait-helpers";
import type { CornerPosition, MouseCoordinates } from "../mouse-proxy.types";
import { getLastKnownMousePosition, isSprintMode, setLastKnownMousePosition } from "./mouse-proxy-state";
import { updateMouseMarkers } from "./mouse-marker";

export function resolveCornerPosition(page: Page, cornerPosition: CornerPosition): MouseCoordinates {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error(CONST.TESTING.MOUSE_PROXY.ERROR_MESSAGES.COULD_NOT_READ_VIEWPORT);

  const x = cornerPosition.corner.endsWith("right")
    ? viewport.width - cornerPosition.offsetX
    : cornerPosition.offsetX;
  const y = cornerPosition.corner.startsWith("bottom")
    ? viewport.height - cornerPosition.offsetY
    : cornerPosition.offsetY;
  return { x, y };
}

export async function drawMousePath(
  page: Page,
  startPosition: MouseCoordinates,
  targetPosition: MouseCoordinates,
): Promise<void> {
  await page.evaluate(
    ({ startX, startY, endX, endY, config }) => {
      const svg = document.getElementById(config.DEBUG_LINE_ID) ??
        document.createElementNS(config.SVG_NAMESPACE, config.TAGS.SVG);
      svg.id = config.DEBUG_LINE_ID;
      svg.style.position = config.VIEWPORT_STYLE.POSITION;
      svg.style.left = config.VIEWPORT_STYLE.LEFT;
      svg.style.top = config.VIEWPORT_STYLE.TOP;
      svg.style.width = config.VIEWPORT_STYLE.WIDTH;
      svg.style.height = config.VIEWPORT_STYLE.HEIGHT;
      svg.style.pointerEvents = config.VIEWPORT_STYLE.POINTER_EVENTS;
      svg.style.zIndex = config.VIEWPORT_STYLE.Z_INDEX;

      const line = document.createElementNS(config.SVG_NAMESPACE, config.TAGS.LINE);
      line.setAttribute(config.LINE_ATTRIBUTES.X1, String(startX));
      line.setAttribute(config.LINE_ATTRIBUTES.Y1, String(startY));
      line.setAttribute(config.LINE_ATTRIBUTES.X2, String(endX));
      line.setAttribute(config.LINE_ATTRIBUTES.Y2, String(endY));
      line.setAttribute(config.LINE_ATTRIBUTES.STROKE, config.COLOR);
      line.setAttribute(config.LINE_ATTRIBUTES.STROKE_WIDTH, config.STROKE_WIDTH);

      const endCircle = document.createElementNS(config.SVG_NAMESPACE, config.TAGS.CIRCLE);
      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.CX, String(endX));
      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.CY, String(endY));
      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.RADIUS, config.ENDPOINT_RADIUS);
      endCircle.setAttribute(config.ENDPOINT_ATTRIBUTES.FILL, config.ENDPOINT_FILL);

      svg.textContent = "";
      svg.append(line, endCircle);
      document.documentElement.appendChild(svg);
      svg.animate(
        [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
        { duration: config.ANIMATION_DURATION_MS, fill: "forwards" },
      );
      window.setTimeout(() => svg.remove(), config.ANIMATION_DURATION_MS);
    },
    {
      startX: startPosition.x,
      startY: startPosition.y,
      endX: targetPosition.x,
      endY: targetPosition.y,
      config: CONST.TESTING.MOUSE_PATH,
    },
  );
}

export async function moveMouseToPosition(
  page: Page,
  targetPosition: MouseCoordinates,
  label: string,
): Promise<void> {
  console.log(`[fobles] S) Mouse move '${label}' `);
  const initialPosition = getLastKnownMousePosition();

  if (isSprintMode()) {
    console.log(`[fobles] Mouse sprint mode: moving directly to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
    await page.mouse.move(targetPosition.x, targetPosition.y);
    setLastKnownMousePosition(targetPosition);
    return;
  }

  console.log(`[fobles] Mouse normal mode: moving to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
  const distance = Math.hypot(
    targetPosition.x - initialPosition.x,
    targetPosition.y - initialPosition.y,
  );
  const durationMs =
    (distance /
      (CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].MOUSE_PX_PER_SECOND *
        CONST.TESTING.MOUSE.SPEED_MULTIPLIER)) *
    1_000;
  const mouseStepDelay = 1_000 / CONST.TESTING.MOUSE.UPDATE_HZ;
  const mouseSteps = Math.max(1, Math.ceil(durationMs / mouseStepDelay));
  console.log(
    `[fobles] Mouse move '${label}': start=(${initialPosition.x.toFixed(1)}, ${initialPosition.y.toFixed(1)}), end=(${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}), distance=${distance.toFixed(1)}px, steps=${mouseSteps}`,
  );
  await drawMousePath(page, initialPosition, targetPosition);
  for (let mouseStep = 1; mouseStep <= mouseSteps; mouseStep += 1) {
    const progress = mouseStep / mouseSteps;
    const x = initialPosition.x + (targetPosition.x - initialPosition.x) * progress;
    const y = initialPosition.y + (targetPosition.y - initialPosition.y) * progress;
    await page.mouse.move(x, y);
    await updateMouseMarkers(page, x, y);
    await foblesWaitForTimeout(page, mouseStepDelay, true);
  }

  setLastKnownMousePosition(targetPosition);
  console.log(
    `[fobles] E) Mouse move '${label}' ended at (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  );
}

export async function moveMouseToDefault(page: Page): Promise<void> {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await showBillboard(page, CONST.TESTING.MOUSE_PROXY.DEFAULT_LABELS.MOUSE_TO_DEFAULT);
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  await moveMouseToPosition(page, center, CONST.TESTING.MOUSE_PROXY.DEFAULT_LABELS.CENTER_OF_MONITOR);
}
