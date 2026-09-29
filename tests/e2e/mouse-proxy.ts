import { showBillboard } from "./billboard";
import { CONST } from "./CONST";
import {
  expect,
  type Frame,
  type Locator,
  type Page,
} from "./fixtures/playwright";
import { foblesWaitForTimeout } from "./helpers/wait-helpers";
import type { CornerPosition, MouseCoordinates } from "./mouse-proxy.types";



// Resolves a viewport-corner-relative position (see CONST.TOOLBAR_DRAG_POSITIONS) into an
// absolute page position a real mouse move/drag can target.
export function resolveCornerPosition(page: Page, cornerPosition: CornerPosition
  // viewport: { width: number; height: number },
  // position: CornerPosition,
): MouseCoordinates {

  // const viewport = { width: window.innerWidth, height: window.innerHeight };
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Could not read viewport size");

  const x = cornerPosition.corner.endsWith("right") ? viewport.width - cornerPosition.offsetX : cornerPosition.offsetX;
  const y = cornerPosition.corner.startsWith("bottom") ? viewport.height - cornerPosition.offsetY : cornerPosition.offsetY;
  return { x, y };
}

// The real (virtual) mouse cursor stays wherever it physically was after a same-tab page
// navigation - only our own tracking variables reset. Callers used to always restart a fresh
// step's tracking position at a hardcoded {x:0, y:0}, which made the very next moveMouseTo/
// moveMouseToPosition animate a long diagonal sweep from the corner instead of a short move from
// wherever the mouse actually last was (typically whatever was just clicked to trigger the
// reload). Updated at the end of every real move below; getLastKnownMousePosition() lets a new
// step start tracking from there instead of guessing (0, 0).
let lastKnownMousePosition: MouseCoordinates = { x: 0, y: 0 };

export function getLastKnownMousePosition(): MouseCoordinates {
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

export async function ensureMouseMarkerExists(page: Page | Frame): Promise<void> {
  if (isSprintMode()) return;

  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  lastKnownMousePosition = { x: viewport.width / 2, y: viewport.height / 2 };
  await page.evaluate((markerConfig) => {
    if (!document.getElementById(markerConfig.ID)) {
      const marker = document.createElement("div");
      marker.id = markerConfig.ID;
      marker.style.cssText = markerConfig.CSS_TEXT.join(";");
      document.documentElement.appendChild(marker);
    }
  }, CONST.MOUSE_MARKER);
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
    // console.log(`[forEachFrameWithLocalPosition] Processing frame: ${frame.url()}`);

    if (frame.url().includes("sitecore/shell/Applications/-/media")) {
      // console.log(`[forEachFrameWithLocalPosition] Skipping frame: ${frame.url()}`);
      continue;
    }

    let localX = x;
    let localY = y;
    try {
      if (frame !== page.mainFrame()) {
        const frameBox = await frame.locator("html").boundingBox();
        if (!frameBox) continue;



        localX -= frameBox.x;
        localY -= frameBox.y;
      }
      await callback(frame, localX, localY);
    } catch (error) {
      console.error(`[forEachFrameWithLocalPosition] Error processing frame: ${frame.url()}`, error);
    }
  }
}

async function updateMouseMarkers(
  page: Page,
  x: number,
  y: number,
): Promise<void> {

  // console.log(`[updateMouseMarkers] Updating mouse marker to position: (${x}, ${y})`);
  await forEachFrameWithLocalPosition(page, x, y, async (frame, localX, localY) => {
    const marker = frame.locator("#playwright-mouse-marker");
    if ((await marker.count()) === 0) {
      // console.log("Mouse marker not found in frame");
    } else {
      // console.log(`[updateMouseMarkers] Callback`);
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
    }
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
        const marker = frame.locator(`#${CONST.MOUSE_MARKER.ID}`);
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
  // await foblesWaitForTimeout(page, CONST.CLICK_FLASH.DURATION_MS);
}

// The single entry point every interactive click in these suites should use: moves the marker to
// the target, flashes it, then clicks - so no call site has to remember/repeat that 3-step
// sequence itself, and every click leaves the same pacing pause behind it. Only skip this for
// clicks that genuinely never appear on screen (e.g. against a page the marker was never shown on).
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

  console.log(
    `[fobles] clickWithMouseMarker '${label}' options: ${JSON.stringify(options)}`,
  );

  if (!page) {
    console.error("Page is not defined");
  }

  if (!(await targetLocator.isVisible())) {
    console.error(`Target is not visible for label: ${label}`);
    throw new Error(`Target is not visible for label: ${label}`);
  }

  if (!label) {
    console.error("Label is not defined");
  }
  const corner = options?.corner ?? "center";
  await moveMouseToBoundingBox(page, targetLocator, label, corner);
  await pulseMouseMarkerClick(page);
  await targetLocator.click({
    modifiers: options?.modifiers,
    clickCount: options?.clickCount,
    position: corner === "top-left" ? { x: 0, y: 0 } : undefined,
  });
  // await foblesWaitForTimeout(page, POST_CLICK_PAUSE_MS, true);
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
    .locator(`#${CONST.MOUSE_MARKER.ID}`)
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
  // await foblesWaitForTimeout(page, 100);

  const movedState = await page
    .locator(`#${CONST.MOUSE_MARKER.ID}`)
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

export async function drawMousePath(
  page: Page,
  startPosition: MouseCoordinates,
  targetPosition: MouseCoordinates,
): Promise<void> {
  await page.evaluate(
    ({ startX, startY, endX, endY }) => {
      const id = "__fobles-debug-line";

      const existing = document.getElementById(id);

      if (existing) {
        existing.remove();
      }

      const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );

      svg.id = id;
      svg.style.position = "fixed";
      svg.style.left = "0";
      svg.style.top = "0";
      svg.style.width = "100vw";
      svg.style.height = "100vh";
      svg.style.pointerEvents = "none";
      svg.style.zIndex = "2147483647";

      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );

      line.setAttribute("x1", String(startX));
      line.setAttribute("y1", String(startY));
      line.setAttribute("x2", String(endX));
      line.setAttribute("y2", String(endY));
      line.setAttribute("stroke", "red");
      line.setAttribute("stroke-width", "3");

      const endCircle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );

      endCircle.setAttribute("cx", String(endX));
      endCircle.setAttribute("cy", String(endY));
      endCircle.setAttribute("r", "8");
      endCircle.setAttribute("fill", "lime");

      svg.appendChild(line);
      svg.appendChild(endCircle);
      document.documentElement.appendChild(svg);

      svg.animate(
        [
          { opacity: 1 },
          { opacity: 1, offset: 0.8 },
          { opacity: 0 },
        ],
        {
          duration: 3000,
          fill: "forwards",
        },
      );

      window.setTimeout(() => {
        if (svg.parentNode) {
          svg.remove();
        }
      }, 3000);
    },
    {
      startX: startPosition.x,
      startY: startPosition.y,
      endX: targetPosition.x,
      endY: targetPosition.y,
    },
  );
}

export async function moveMouseToBoundingBox(
  page: Page,
  targetLocator: Locator,
  label: string,
  corner: "center" | "top-left" = "center",
): Promise<void> {
  console.log(`[fobles] S) moveMouseToBoundingBox '${label}'`);

  if (!targetLocator) {
    console.error(`no mouse target provided for '${label}'`);
    throw new Error("no mouse target provided");
  }

  console.log(await targetLocator.count());
  console.log(await targetLocator.isVisible());

  const elementHandle = await targetLocator.elementHandle();
  //console.log(elementHandle);


  if (!(await targetLocator.isVisible())) {
    console.error(`Mouse target '${label}' is not visible`);
    throw new Error("Mouse target is not visible");
  }

  await highlightLocator(targetLocator, label);

  const box = await targetLocator.boundingBox();
  if (!box) {
    console.error(`Could not get bounding box for mouse target '${label}' `);
    throw new Error("Could not locate mouse target");
  }

  console.log(`[fobles] Mouse target '${label}'`);
  const targetPosition =
    corner === "top-left"
      ? { x: box.x, y: box.y }
      : { x: box.x + box.width / 2, y: box.y + box.height / 2 };


  await moveMouseToPosition(page, targetPosition, label);
  console.log(`[fobles] E) Mouse move to '${label}' called`);
}

export async function highlightLocator(
  target: Locator,
  label: string,
): Promise<void> {
  const count = await target.count();

  if (count === 0) {
    console.warn(`[fobles] Highlight skipped: '${label}' matched 0 elements`);
    return;
  }

  if (count > 1) {
    console.warn(`[fobles] '${label}' matched ${count} elements, using first match`);
  }

  target = target.first();

  console.log(`[fobles] Highlighting locator '${label}'`);

  const original = await target.evaluate((element) => {
    const el = element as HTMLElement;

    return {
      outline: el.style.outline,
      outlineOffset: el.style.outlineOffset,
      backgroundColor: el.style.backgroundColor,
    };
  });

  await target.evaluate((element) => {
    const el = element as HTMLElement;

    el.style.outline = "5px solid red";
    el.style.outlineOffset = "2px";
    el.style.backgroundColor = "yellow";
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await target.evaluate(
    (element, originalStyles) => {
      const el = element as HTMLElement;

      el.style.outline = originalStyles.outline;
      el.style.outlineOffset = originalStyles.outlineOffset;
      el.style.backgroundColor = originalStyles.backgroundColor;
    },
    original,
  );
}


export async function moveMouseToLocatorCenter(
  page: Page,
  targetLocator: Locator,
  label: string,
): Promise<void> {
  await moveMouseToBoundingBox(page, targetLocator, label, "center");
}


export async function moveMouseToPosition(
  page: Page,
  targetPosition: MouseCoordinates,
  label: string,
): Promise<void> {

  console.log(`[fobles] S) Mouse move '${label}' `);
  const initialPosition: MouseCoordinates = getLastKnownMousePosition();

  if (isSprintMode()) {
    console.log(`[fobles] Mouse sprint mode: moving directly to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
    await page.mouse.move(targetPosition.x, targetPosition.y);
    initialPosition.x = targetPosition.x;
    initialPosition.y = targetPosition.y;
    lastKnownMousePosition = { ...initialPosition };
    return;
  } else {
    console.log(`[fobles] Mouse normal mode: moving to (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)})`);
  }

  const startPosition = { ...initialPosition };
  const distance = Math.hypot(
    targetPosition.x - initialPosition.x,
    targetPosition.y - initialPosition.y,
  );
  const durationMs =
    (distance /
      (CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].MOUSE_PX_PER_SECOND *
        CONST.MOUSE.SPEED_MULTIPLIER)) *
    1_000;
  const mouseStepDelay = 1_000 / CONST.MOUSE.UPDATE_HZ;
  const mouseSteps = Math.max(1, Math.ceil(durationMs / mouseStepDelay));
  console.log(
    `[fobles] Mouse move '${label}': start=(${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}), end=(${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}), distance=${distance.toFixed(1)}px, steps=${mouseSteps}`,
  );
  drawMousePath(page, startPosition, targetPosition);
  for (let mouseStep = 1; mouseStep <= mouseSteps; mouseStep += 1) {
    // console.log(`[fobles] Mouse move '${label}': step ${mouseStep}/${mouseSteps}`);
    const progress = mouseStep / mouseSteps;
    const x = initialPosition.x + (targetPosition.x - initialPosition.x) * progress;
    const y = initialPosition.y + (targetPosition.y - initialPosition.y) * progress;
    await page.mouse.move(x, y);
    await updateMouseMarkers(page, x, y);
    await foblesWaitForTimeout(page, mouseStepDelay, true);
  }
  // console.log(`Mouse markers done`);

  initialPosition.x = targetPosition.x;
  initialPosition.y = targetPosition.y;
  lastKnownMousePosition = { ...initialPosition };
  console.log(
    `[fobles] E) Mouse move '${label}' ended at (${initialPosition.x.toFixed(1)}, ${initialPosition.y.toFixed(1)})`,
  );
}
export async function moveMousetoCenterMonitor(page: Page): Promise<void> {
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await showBillboard(page, "Mouse to default");
  const center = { x: viewport.width / 2, y: viewport.height / 2 };
  await moveMouseToPosition(page, center, "center of monitor");
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
  await moveMouseToPosition(page, targetPosition, label);
}
