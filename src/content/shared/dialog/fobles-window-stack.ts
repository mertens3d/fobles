// @source-path [fobles] src/content/shared/dialog/fobles-window-stack.ts

import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";
import { extensionLog } from "../../logger";
import {
  FOBLES_WINDOW_COLLAPSED_WIDTH,
  FOBLES_WINDOW_TITLE_BAR_HEIGHT,
  FOBLES_WINDOW_VIEWPORT_MARGIN,
} from "./fobles-window.const";

const STACK_STORAGE_KEY = "fobles.window.stack";
const WINDOW_SELECTOR = ".fobles-window[data-fobles-window-key]";
const WINDOW_STACK_BASE_Z_INDEX = 101;
const COLLAPSED_LEFT_PROPERTY = "--fobles-window-collapsed-left";
const COLLAPSED_TOP_PROPERTY = "--fobles-window-collapsed-top";
const COLLAPSED_ORDER_PROPERTY = "foblesCollapsedOrder";
let nextCollapsedOrder = 0;

type PersistedWindowStack = { order: string[] };

function mountedWindows(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(WINDOW_SELECTOR));
}

function windowKey(element: HTMLElement): string {
  return element.dataset.foblesWindowKey ?? "";
}

function currentZIndex(element: HTMLElement): number {
  const value = Number.parseInt(window.getComputedStyle(element).zIndex, 10);
  return Number.isFinite(value) ? value : 0;
}

function persistOrder(windows: readonly HTMLElement[]): void {
  void setStorageValue(
    { [STACK_STORAGE_KEY]: { order: windows.map(windowKey).filter(Boolean) } satisfies PersistedWindowStack },
    "local",
  );
}

function normalize(windows: readonly HTMLElement[]): void {
  if (windows.length === 0) {
    return;
  }
  const base = WINDOW_STACK_BASE_Z_INDEX;
  windows.forEach((element, index) => {
    element.style.zIndex = String(base + index);
  });
  const expanded = windows.filter((element) => !element.classList.contains("is-collapsed"));
  expanded.forEach((element) => {
    delete element.dataset[COLLAPSED_ORDER_PROPERTY];
  });
  const collapsed = windows.filter((element) => element.classList.contains("is-collapsed"));
  collapsed.forEach((element) => {
    if (element.dataset[COLLAPSED_ORDER_PROPERTY] === undefined) {
      element.dataset[COLLAPSED_ORDER_PROPERTY] = String(nextCollapsedOrder++);
    }
  });
  collapsed.sort(
    (left, right) => Number(left.dataset[COLLAPSED_ORDER_PROPERTY]) - Number(right.dataset[COLLAPSED_ORDER_PROPERTY]),
  );
  expanded.forEach((element) => {
    const collapsedLeft = element.style.getPropertyValue(COLLAPSED_LEFT_PROPERTY);
    const collapsedTop = element.style.getPropertyValue(COLLAPSED_TOP_PROPERTY);
    element.style.removeProperty(COLLAPSED_LEFT_PROPERTY);
    element.style.removeProperty(COLLAPSED_TOP_PROPERTY);
    if (collapsedLeft || collapsedTop) {
      extensionLog.debug("Fobles window stack: released collapsed docking", {
        windowKey: windowKey(element),
        collapsedLeft,
        collapsedTop,
        inlineLeft: element.style.left,
        inlineTop: element.style.top,
        inlineWidth: element.style.width,
        inlineHeight: element.style.height,
      });
    }
  });
  const width = FOBLES_WINDOW_COLLAPSED_WIDTH;
  const gap = 4;
  const availableWidth = Math.max(width, window.innerWidth - FOBLES_WINDOW_VIEWPORT_MARGIN * 2);
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (width + gap)));
  collapsed.forEach((element, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const collapsedLeft = `${FOBLES_WINDOW_VIEWPORT_MARGIN + column * (width + gap)}px`;
    const collapsedTop = `${window.innerHeight - FOBLES_WINDOW_VIEWPORT_MARGIN - (row + 1) * FOBLES_WINDOW_TITLE_BAR_HEIGHT - row * gap}px`;
    element.style.setProperty(COLLAPSED_LEFT_PROPERTY, collapsedLeft);
    element.style.setProperty(COLLAPSED_TOP_PROPERTY, collapsedTop);
    extensionLog.debug("Fobles window stack: applied collapsed docking", {
      windowKey: windowKey(element),
      collapsedOrder: element.dataset[COLLAPSED_ORDER_PROPERTY],
      collapsedLeft,
      collapsedTop,
      inlineLeft: element.style.left,
      inlineTop: element.style.top,
      inlineWidth: element.style.width,
      inlineHeight: element.style.height,
    });
  });
}

export function syncFoblesWindowStack(): void {
  const windows = mountedWindows().sort((a, b) => currentZIndex(a) - currentZIndex(b));
  normalize(windows);
}

export function bringFoblesWindowToFront(element: HTMLElement): void {
  const windows = mountedWindows()
    .sort((a, b) => currentZIndex(a) - currentZIndex(b))
    .filter((candidate) => candidate !== element);
  windows.push(element);
  normalize(windows);
  persistOrder(windows);
}

export function registerFoblesWindow(element: HTMLElement): () => void {
  let active = true;
  void getStorageValue<unknown>([STACK_STORAGE_KEY], "local").then((values) => {
    if (!active) {
      return;
    }
    const stored = values[STACK_STORAGE_KEY];
    const persistedOrder =
      stored && typeof stored === "object" && Array.isArray((stored as PersistedWindowStack).order)
        ? (stored as PersistedWindowStack).order
        : [];
    const rank = new Map(persistedOrder.map((key, index) => [key, index]));
    const windows = mountedWindows().sort(
      (a, b) =>
        (rank.get(windowKey(a)) ?? Number.MAX_SAFE_INTEGER) - (rank.get(windowKey(b)) ?? Number.MAX_SAFE_INTEGER),
    );
    normalize(windows);
  });
  bringFoblesWindowToFront(element);
  return () => {
    active = false;
    queueMicrotask(syncFoblesWindowStack);
  };
}
