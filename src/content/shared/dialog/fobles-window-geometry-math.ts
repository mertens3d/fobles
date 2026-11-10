// @source-path [fobles] src/content/shared/dialog/fobles-window-geometry-math.ts

import { FOBLES_WINDOW } from "./fobles-window.const.ts";
import type { FoblesWindowState, WindowRect } from "./fobles-window.types.ts";

export function viewportRect(win: Window): { width: number; height: number } {
  return { width: win.innerWidth, height: win.innerHeight };
}

export function clampRect(win: Window, rect: WindowRect, minWidth: number, minHeight: number): WindowRect {
  const viewport = viewportRect(win);
  const maxWidth = Math.max(minWidth, viewport.width - FOBLES_WINDOW.VIEWPORT_MARGIN * 2);
  const maxHeight = Math.max(minHeight, viewport.height - FOBLES_WINDOW.VIEWPORT_MARGIN * 2);
  const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
  const height = Math.min(maxHeight, Math.max(minHeight, rect.height));
  const left = Math.min(
    viewport.width - FOBLES_WINDOW.VIEWPORT_MARGIN - width,
    Math.max(FOBLES_WINDOW.VIEWPORT_MARGIN, rect.left),
  );
  const top = Math.min(
    viewport.height - FOBLES_WINDOW.VIEWPORT_MARGIN - FOBLES_WINDOW.TITLE_BAR_HEIGHT,
    Math.max(FOBLES_WINDOW.VIEWPORT_MARGIN, rect.top),
  );
  return { left, top, width, height };
}

export function centeredRect(
  win: Window,
  width: number,
  height: number,
  minWidth: number,
  minHeight: number,
): WindowRect {
  const viewport = viewportRect(win);
  return clampRect(
    win,
    { left: Math.round((viewport.width - width) / 2), top: Math.round((viewport.height - height) / 2), width, height },
    minWidth,
    minHeight,
  );
}

export function readRect(element: HTMLElement): WindowRect {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

// Validates and clamps a raw persisted-storage value into a live-ready partial state, or returns
// undefined if the record isn't usable (wrong shape, foreign discriminator, non-finite numbers).
// Clamping here (not just on the next drag/resize) prevents a stale/corrupt/off-viewport record
// from rendering the window with a negative or oversized geometry before any further interaction.
export function parsePersistedFoblesWindowState(
  stored: unknown,
  win: Window,
  minWidth: number,
  minHeight: number,
): Partial<FoblesWindowState> | undefined {
  if (!stored || typeof stored !== "object") {
    return undefined;
  }
  const candidate = stored as Partial<FoblesWindowState>;
  if (candidate.type !== undefined && candidate.type !== FOBLES_WINDOW.STATE_TYPE) {
    return undefined;
  }
  const hasValidRect = [candidate.left, candidate.top, candidate.width, candidate.height].every(
    (value) => typeof value === "number" && Number.isFinite(value),
  );
  if (!hasValidRect) {
    return undefined;
  }
  const clamped = clampRect(
    win,
    {
      left: candidate.left as number,
      top: candidate.top as number,
      width: candidate.width as number,
      height: candidate.height as number,
    },
    minWidth,
    minHeight,
  );
  return { ...clamped, collapsed: candidate.collapsed === true, maximized: candidate.maximized === true };
}
