import { expect, type Frame, type Page } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import { hasLastKnownMousePosition, isSprintMode, setLastKnownMousePosition } from "./mouse-proxy-state";

type LocalMousePosition = {
  x: number;
  y: number;
  OPEN_DIALOG_SELECTOR: string;
};

export async function ensureMouseMarkerExists(page: Page | Frame): Promise<void> {
  const isHtmlPage = await page.evaluate(() => document.contentType.startsWith("text/html"));

  if (!isSprintMode() && isHtmlPage) {
    if (!hasLastKnownMousePosition()) {
      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

      setLastKnownMousePosition({ x: viewport.width / 2, y: viewport.height / 2 });
    }

    await page.evaluate((markerConfig) => {
      if (!document.getElementById(markerConfig.ID)) {
        const marker = document.createElement("div");
        marker.id = markerConfig.ID;
        marker.style.cssText = markerConfig.CSS_TEXT.join(";");
        document.documentElement.appendChild(marker);
      }
    }, TEST_CONST.TESTING.MOUSE.MARKER);
  }
}

function isDetachedMouseMarkerFrameError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("frame was detached");
}

async function forEachFrameForMouseMarker(
  page: Page,
  x: number,
  y: number,
  callback: (frame: Frame, localX: number, localY: number) => Promise<void>,
): Promise<void> {
  for (const frame of page.frames()) {
    if (
      frame.isDetached() ||
      frame.url().includes(TEST_CONST.TESTING.MOUSE.PROXY.EXCLUDED_FRAME_URL_FRAGMENT)
    ) continue;

    let localX = x;
    let localY = y;

    try {
      if (frame !== page.mainFrame()) {
        const frameBox = await frame.locator(TEST_CONST.TESTING.MOUSE.PROXY.HTML_TAG).boundingBox();
        if (!frameBox || frame.isDetached()) continue;
        localX -= frameBox.x;
        localY -= frameBox.y;
      }

      await callback(frame, localX, localY);
    } catch (error) {
      if (frame.isDetached() || isDetachedMouseMarkerFrameError(error)) continue;

      console.error(
        `[${forEachFrameForMouseMarker.name}] Error processing mouse-marker frame: ${frame.url()}`,
        error,
      );
    }
  }
}

async function updateMouseMarkerInFrame(
  frame: Frame,
  x: number,
  y: number,
): Promise<void> {
  if (frame.isDetached()) return;

  const marker = frame.locator(
    `${TEST_CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${TEST_CONST.TESTING.MOUSE.MARKER.ID}`,
  );

  if ((await marker.count()) === 0) return;

  const coordinates: LocalMousePosition = {
    x,
    y,
    OPEN_DIALOG_SELECTOR: TEST_CONST.TESTING.MOUSE.PROXY.OPEN_DIALOG_SELECTOR,
  };

  await marker.evaluate((element, position) => {
    const openDialog = document.querySelector(position.OPEN_DIALOG_SELECTOR);

    if (openDialog && element.parentElement !== openDialog) {
      openDialog.appendChild(element);
    } else if (!openDialog && element.parentElement !== document.documentElement) {
      document.documentElement.appendChild(element);
    }

    (element as HTMLElement).style.left = `${position.x}px`;
    (element as HTMLElement).style.top = `${position.y}px`;
  }, coordinates);
}

async function updateMouseMarkersAcrossFrames(page: Page, x: number, y: number): Promise<void> {
  await forEachFrameForMouseMarker(
    page,
    x,
    y,
    async (frame, localX, localY) => {
      await updateMouseMarkerInFrame(frame, localX, localY);
    },
  );
}

export async function updateMouseMarkers(page: Page, x: number, y: number): Promise<void> {
  if (TEST_CONST.TESTING.SYNC_MOUSE_MARKERS_ACROSS_FRAMES) {
    await updateMouseMarkersAcrossFrames(page, x, y);
  } else {
    await updateMouseMarkerInFrame(page.mainFrame(), x, y);
  }
}

async function pulseMouseMarkerInFrame(frame: Frame): Promise<void> {
  if (frame.isDetached()) return;

  const marker = frame.locator(
    `${TEST_CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${TEST_CONST.TESTING.MOUSE.MARKER.ID}`,
  );

  if ((await marker.count()) === 0) return;

  await marker.evaluate((element, config) => {
    const el = element as HTMLElement;
    const openDialog = document.querySelector(config.OPEN_DIALOG_SELECTOR);

    if (openDialog && el.parentElement !== openDialog) openDialog.appendChild(el);

    const originalBackground = el.style.background;
    el.style.background = config.COLOR;

    setTimeout(() => {
      el.style.background = originalBackground;
    }, config.DURATION_MS);
  }, {
    ...TEST_CONST.TESTING.CLICK_FLASH,
    OPEN_DIALOG_SELECTOR: TEST_CONST.TESTING.MOUSE.PROXY.OPEN_DIALOG_SELECTOR,
  });
}

export async function pulseMouseMarkerClick(page: Page): Promise<void> {
  if (isSprintMode()) return;

  const frames = TEST_CONST.TESTING.SYNC_MOUSE_MARKERS_ACROSS_FRAMES
    ? page.frames()
    : [page.mainFrame()];

  await Promise.all(
    frames.map(async (frame) => {
      try {
        await Promise.race([
          pulseMouseMarkerInFrame(frame),
          new Promise((resolve) =>
            setTimeout(resolve, TEST_CONST.TESTING.MOUSE.PROXY.RACE_TIMEOUT_MS),
          ),
        ]);
      } catch {
        // Cosmetic marker behavior must never fail a test when Sitecore detaches a frame.
      }
    }),
  );
}

export async function verifyMouseMarker(page: Page): Promise<void> {
  if (isSprintMode()) {
    console.log("[fobles] Mouse preflight skipped (SPRINT mode - no marker in use)");
    return;
  }

  const markerSelector =
    `${TEST_CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${TEST_CONST.TESTING.MOUSE.MARKER.ID}`;

  const markerState = await page.locator(markerSelector).evaluate((marker) => {
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

  console.log(`[fobles] Mouse preflight initial marker: ${JSON.stringify(markerState)}`);

  await page.mouse.move(
    TEST_CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION_PX,
    TEST_CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION_PX,
  );

  await page.locator(markerSelector).evaluate((marker, position) => {
    const element = marker as HTMLElement;
    element.style.transition = position.TRANSITION;
    element.style.left = position.POSITION;
    element.style.top = position.POSITION;
  }, {
    POSITION: TEST_CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION,
    TRANSITION: TEST_CONST.TESTING.MOUSE.PROXY.PREFLIGHT_TRANSITION,
  });

  const movedState = await page.locator(markerSelector).evaluate((marker) => {
    const box = marker.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });

  console.log(`[fobles] Mouse preflight moved marker: ${JSON.stringify(movedState)}`);

  expect(movedState.width).toBeGreaterThan(0);
  expect(movedState.height).toBeGreaterThan(0);
  expect(movedState.left).toBeGreaterThan(90);
  expect(movedState.top).toBeGreaterThan(90);
}