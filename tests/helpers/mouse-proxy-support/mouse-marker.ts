import { expect, type Frame, type Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { hasLastKnownMousePosition, isSprintMode, setLastKnownMousePosition } from "./mouse-proxy-state";

type LocalMousePosition = {
  x: number;
  y: number;
  OPEN_DIALOG_SELECTOR: string;
};

export async function ensureMouseMarkerExists(page: Page | Frame): Promise<void> {
  
const isHtmlPage = await page.evaluate(
  () => document.contentType.startsWith("text/html"),
);

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
        const cssText = markerConfig.CSS_TEXT.join(";");
        marker.style.cssText = cssText;
        document.documentElement.appendChild(marker);
      }
    }, CONST.TESTING.MOUSE.MARKER);
  }
}

async function forEachFrameWithLocalPosition(
  page: Page,
  x: number,
  y: number,
  callback: (frame: Frame, localX: number, localY: number) => Promise<void>,
): Promise<void> {
  for (const frame of page.frames()) {
    if (frame.url().includes(CONST.TESTING.MOUSE.PROXY.EXCLUDED_FRAME_URL_FRAGMENT)) continue;

    let localX = x;
    let localY = y;
    try {
      if (frame !== page.mainFrame()) {
        const frameBox = await frame.locator(CONST.TESTING.MOUSE.PROXY.HTML_TAG).boundingBox();
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

export async function updateMouseMarkers(page: Page, x: number, y: number): Promise<void> {
  await forEachFrameWithLocalPosition(page, x, y, async (frame, localX, localY) => {
    const marker = frame.locator(
      `${CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${CONST.TESTING.MOUSE.MARKER.ID}`,
    );
    if ((await marker.count()) === 0) return;

    const coordinates: LocalMousePosition = {
      x: localX,
      y: localY,
      OPEN_DIALOG_SELECTOR: CONST.TESTING.MOUSE.PROXY.OPEN_DIALOG_SELECTOR,
    };
    await marker.evaluate((element, position) => {
      const openDialog = document.querySelector(position.OPEN_DIALOG_SELECTOR);
      if (openDialog && element.parentElement !== openDialog) {
        openDialog.appendChild(element);
      } else if (!openDialog && element.parentElement !== document.documentElement) {
        document.documentElement.appendChild(element);
      }
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    }, coordinates);
  });
}

export async function pulseMouseMarkerClick(page: Page): Promise<void> {
  if (isSprintMode()) return;
  await Promise.all(
    page.frames().map(async (frame) => {
      const flashInFrame = async () => {
        const marker = frame.locator(
          `${CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${CONST.TESTING.MOUSE.MARKER.ID}`,
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
          ...CONST.TESTING.CLICK_FLASH,
          OPEN_DIALOG_SELECTOR: CONST.TESTING.MOUSE.PROXY.OPEN_DIALOG_SELECTOR,
        });
      };

      try {
        await Promise.race([
          flashInFrame(),
          new Promise((resolve) => setTimeout(resolve, CONST.TESTING.MOUSE.PROXY.RACE_TIMEOUT_MS)),
        ]);
      } catch {
        // A cosmetic flash should not fail a click when a frame is navigating or detaching.
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
    `${CONST.TESTING.MOUSE.PROXY.SELECTOR_PREFIX}${CONST.TESTING.MOUSE.MARKER.ID}`;
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
    CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION_PX,
    CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION_PX,
  );
  await page.locator(markerSelector).evaluate((marker, position) => {
    const element = marker as HTMLElement;
    element.style.transition = position.TRANSITION;
    element.style.left = position.POSITION;
    element.style.top = position.POSITION;
  }, {
    POSITION: CONST.TESTING.MOUSE.PROXY.PREFLIGHT_POSITION,
    TRANSITION: CONST.TESTING.MOUSE.PROXY.PREFLIGHT_TRANSITION,
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
