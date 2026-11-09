// @source-path [fobles] src/content/shared/dialog/fobles-window-stack.ts

import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";
import { FOBLES_WINDOW_COLLAPSED_WIDTH, FOBLES_WINDOW_TITLE_BAR_HEIGHT, FOBLES_WINDOW_VIEWPORT_MARGIN } from "./fobles-window.const";

const STACK_STORAGE_KEY = "fobles.window.stack";
const WINDOW_SELECTOR = ".fobles-window[data-fobles-window-key]";
const WINDOW_STACK_BASE_Z_INDEX = 10000;

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
  void setStorageValue({ [STACK_STORAGE_KEY]: { order: windows.map(windowKey).filter(Boolean) } satisfies PersistedWindowStack }, "local");
}

function normalize(windows: readonly HTMLElement[]): void {
  if (windows.length === 0) { return; }
  const base = WINDOW_STACK_BASE_Z_INDEX;
  windows.forEach((element, index) => {
    element.style.zIndex = String(base + index);
  });
  const collapsed = windows.filter((element) => element.classList.contains("is-collapsed"));
  const width = FOBLES_WINDOW_COLLAPSED_WIDTH;
  const gap = 4;
  const availableWidth = Math.max(width, window.innerWidth - FOBLES_WINDOW_VIEWPORT_MARGIN * 2);
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (width + gap)));
  collapsed.forEach((element, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    element.style.width = `${width}px`;
    element.style.height = `${FOBLES_WINDOW_TITLE_BAR_HEIGHT}px`;
    element.style.left = `${FOBLES_WINDOW_VIEWPORT_MARGIN + column * (width + gap)}px`;
    element.style.top = `${window.innerHeight - FOBLES_WINDOW_VIEWPORT_MARGIN - (row + 1) * FOBLES_WINDOW_TITLE_BAR_HEIGHT - row * gap}px`;
  });
}

export function syncFoblesWindowStack(): void {
  const windows = mountedWindows().sort((a, b) => currentZIndex(a) - currentZIndex(b));
  normalize(windows);
}

export function bringFoblesWindowToFront(element: HTMLElement): void {
  const windows = mountedWindows().sort((a, b) => currentZIndex(a) - currentZIndex(b)).filter((candidate) => candidate !== element);
  windows.push(element);
  normalize(windows);
  persistOrder(windows);
}

export function registerFoblesWindow(element: HTMLElement): () => void {
  let active = true;
  void getStorageValue<unknown>([STACK_STORAGE_KEY], "local").then((values) => {
    if (!active) { return; }
    const stored = values[STACK_STORAGE_KEY];
    const persistedOrder = stored && typeof stored === "object" && Array.isArray((stored as PersistedWindowStack).order) ? (stored as PersistedWindowStack).order : [];
    const rank = new Map(persistedOrder.map((key, index) => [key, index]));
    const windows = mountedWindows().sort((a, b) => (rank.get(windowKey(a)) ?? Number.MAX_SAFE_INTEGER) - (rank.get(windowKey(b)) ?? Number.MAX_SAFE_INTEGER));
    normalize(windows);
  });
  bringFoblesWindowToFront(element);
  return () => { active = false; queueMicrotask(syncFoblesWindowStack); };
}
