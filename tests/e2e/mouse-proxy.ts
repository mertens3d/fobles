import { CONST } from "./CONST";
import {
  expect,
  type Frame,
  type Locator,
  type Page,
} from "./fixtures/playwright";
import type { CornerPosition, MousePosition } from "./mouse-proxy.types";



// Resolves a viewport-corner-relative position (see CONST.TOOLBAR_DRAG_POSITIONS) into an
// absolute page position a real mouse move/drag can target.
export function resolveCornerPosition(
  viewport: { width: number; height: number },
  position: CornerPosition,
): MousePosition {
  const x = position.corner.endsWith("right") ? viewport.width - position.offsetX : position.offsetX;
  const y = position.corner.startsWith("bottom") ? viewport.height - position.offsetY : position.offsetY;
  return { x, y };
}

// The real (virtual) mouse cursor stays wherever it physically was after a same-tab page
// navigation - only our own tracking variables reset. Callers used to always restart a fresh
// step's tracking position at a hardcoded {x:0, y:0}, which made the very next moveMouseTo/
// moveMouseToPosition animate a long diagonal sweep from the corner instead of a short move from
// wherever the mouse actually last was (typically whatever was just clicked to trigger the
// reload). Updated at the end of every real move below; getLastKnownMousePosition() lets a new
// step start tracking from there instead of guessing (0, 0).
let lastKnownMousePosition: MousePosition = { x: 0, y: 0 };

export function getLastKnownMousePosition(): MousePosition {
  return { ...lastKnownMousePosition };
}

// SPRINT mode is for verification runs nobody is watching - skip the marker graphic, click flash,
// and stepped movement animation entirely, since they're purely cosmetic and only exist to make
// the mouse's path/clicks visible to a human observer.
export function isSprintMode(): boolean {
  return CONST.SPEED.SELECTED === "SPRINT";
}

// clickWithMouseMarker's own post-click pause - lets a human watching see the click's effect land
// before the next action fires. Tied to the selected speed like every other pacing pause in these
// suites (0 for SPRINT, so verification-only runs stay fast).
const POST_CLICK_PAUSE_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

export async function getButtonSize(
  button: Locator,
): Promise<{ width: number; height: number }> {
  const box = await button.boundingBox();
  if (!box) throw new Error("Could not measure the hovered toolbar button");
  return { width: box.width, height: box.height };
}

export async function showMouseMarker(page: Page | Frame): Promise<void> {
  if (isSprintMode()) return;
  await page.evaluate((markerConfig) => {
    if (document.getElementById(markerConfig.ID)) return;

    const marker = document.createElement("div");
    marker.id = markerConfig.ID;
    marker.style.cssText = markerConfig.CSS_TEXT.join(";");
    document.documentElement.appendChild(marker);
  }, CONST.MARKER);
}

// Shared by marker-position updates and the click ripple - a page-level (x, y) needs translating
// into each frame's own local coordinates before it means anything inside that frame's document.
async function forEachFrameWithLocalPosition(
  page: Page,
  x: number,
  y: number,
  callback: (frame: Frame, localX: number, localY: number) => Promise<void>,
): Promise<void> {
  for (const frame of page.frames()) {
    let localX = x;
    let localY = y;
    if (frame !== page.mainFrame()) {
      const frameBox = await frame.locator("html").boundingBox();
      if (!frameBox) continue;
      localX -= frameBox.x;
      localY -= frameBox.y;
    }
    await callback(frame, localX, localY);
  }
}

async function updateMouseMarkers(
  page: Page,
  x: number,
  y: number,
): Promise<void> {
  await forEachFrameWithLocalPosition(page, x, y, async (frame, localX, localY) => {
    const marker = frame.locator("#playwright-mouse-marker");
    if ((await marker.count()) === 0) return;

    await marker.evaluate(
      (element, coordinates) => {
        // A native <dialog> shown via showModal() (e.g. Fobles' own confirm dialog) paints in the
        // browser's "top layer", which renders above every normal element regardless of z-index -
        // no z-index value on the marker itself can win against that. Reparenting the marker
        // inside the open dialog puts it in that same top layer so it stays visible; move it back
        // to <html> once the dialog closes.
        const openDialog = document.querySelector("dialog[open]");
        if (openDialog && element.parentElement !== openDialog) {
          openDialog.appendChild(element);
        } else if (!openDialog && element.parentElement !== document.documentElement) {
          document.documentElement.appendChild(element);
        }
        element.style.left = `${coordinates.x}px`;
        element.style.top = `${coordinates.y}px`;
      },
      { x: localX, y: localY },
    );
  });
}

// A brief color flash on the (already-visible) marker itself, fired right before a simulated
// click - simpler and more reliably visible than a separate animated ring element. Waits out the
// flash before returning so callers see it land before the click. This is purely cosmetic, so a
// frame that's mid-navigation/detaching must never be allowed to hang the real test - bound each
// frame's work with a timeout and swallow errors instead of propagating them.
export async function pulseMouseMarkerClick(page: Page): Promise<void> {
  if (isSprintMode()) return;
  await Promise.all(
    page.frames().map(async (frame) => {
      const flashInFrame = async () => {
        const marker = frame.locator(`#${CONST.MARKER.ID}`);
        if ((await marker.count()) === 0) return;

        await marker.evaluate((element, config) => {
          const el = element as HTMLElement;
          // See updateMouseMarkers - keeps the flash visible even if the click landed inside a
          // dialog opened since the marker's last move (e.g. a click with no move beforehand).
          const openDialog = document.querySelector("dialog[open]");
          if (openDialog && el.parentElement !== openDialog) {
            openDialog.appendChild(el);
          }
          const originalBackground = el.style.background;
          el.style.background = config.COLOR;
          setTimeout(() => {
            el.style.background = originalBackground;
          }, config.DURATION_MS);
        }, CONST.CLICK_FLASH);
      };

      try {
        await Promise.race([
          flashInFrame(),
          new Promise((resolve) => setTimeout(resolve, 1_000)),
        ]);
      } catch {
        // Frame may be navigating/detaching - the flash is cosmetic only, never worth failing over.
      }
    }),
  );
  await page.waitForTimeout(CONST.CLICK_FLASH.DURATION_MS);
}

// The single entry point every interactive click in these suites should use: moves the marker to
// the target, flashes it, then clicks - so no call site has to remember/repeat that 3-step
// sequence itself, and every click leaves the same pacing pause behind it. Only skip this for
// clicks that genuinely never appear on screen (e.g. against a page the marker was never shown on).
export async function clickWithMouseMarker(
  page: Page,
  target: Locator,
  label: string,
  options?: {
    modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
    clickCount?: number;
    corner?: "center" | "top-left";
  },
): Promise<void> {
  const corner = options?.corner ?? "center";
  await moveMouseTo(page, target, getLastKnownMousePosition(), label, corner);
  await pulseMouseMarkerClick(page);
  await target.click({
    modifiers: options?.modifiers,
    clickCount: options?.clickCount,
    position: corner === "top-left" ? { x: 0, y: 0 } : undefined,
  });
  await page.waitForTimeout(POST_CLICK_PAUSE_MS);
}

// A one-time diagnostic sanity check that the marker element actually exists and responds to
// position updates - NOT meant to run on every navigation/activation. It hard-jumps the real
// mouse and force-sets the marker's CSS position directly (bypassing moveMouseToPosition's
// animation and lastKnownMousePosition tracking entirely), so calling it more than once per test
// run produces a jarring, out-of-place jump - confirmed live when it was previously called inside
// activateFoblesForJumpTest (tests/e2e/fobles-helpers.ts) on every tree-jump re-navigation.
export async function verifyMouseMarker(page: Page): Promise<void> {
  if (isSprintMode()) {
    console.log("[fobles] Mouse preflight skipped (SPRINT mode - no marker in use)");
    return;
  }
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
  console.log(
    `[fobles] Mouse preflight initial marker: ${JSON.stringify(markerState)}`,
  );

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
  console.log(
    `[fobles] Mouse preflight moved marker: ${JSON.stringify(movedState)}`,
  );
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
  corner: "center" | "top-left" = "center",
): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error("Could not locate mouse target");

  console.log(`[fobles] Mouse target ${label}: ${JSON.stringify(box)}`);
  const targetPosition =
    corner === "top-left"
      ? { x: box.x, y: box.y }
      : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await moveMouseToPosition(page, targetPosition, position, label);
}

export async function moveMouseToPosition(
  page: Page,
  targetPosition: MousePosition,
  position: MousePosition,
  label: string,
): Promise<void> {
  if (isSprintMode()) {
    await page.mouse.move(targetPosition.x, targetPosition.y);
    position.x = targetPosition.x;
    position.y = targetPosition.y;
    lastKnownMousePosition = { ...position };
    return;
  }

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
  console.log(
    `[fobles] Mouse move ${label}: start=(${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}), end=(${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}), distance=${distance.toFixed(1)}px, steps=${steps}`,
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
  lastKnownMousePosition = { ...position };
  console.log(
    `[fobles] Mouse move ${label} ended at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`,
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
    throw new Error("Could not locate Fobles hover region");

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

  console.log(
    `[fobles] Hover boundary ${label}: outside ${JSON.stringify(sourceBox)} => (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`,
  );
  await moveMouseToPosition(page, targetPosition, position, label);
}
