import { setJumpMenuVisible } from "./index";

let quickMenuPinned = false;

export function isJumpMenuPinned(): boolean {
  return quickMenuPinned;
}

export function setJumpMenuPinned(doc: Document, pinned: boolean): void {
  quickMenuPinned = pinned;
  if (pinned) setJumpMenuVisible(doc, true);
}

let quickMenuCloseTimer: number | null = null;

export function cancelJumpMenuClose(): void {
  if (quickMenuCloseTimer === null) return;
  window.clearTimeout(quickMenuCloseTimer);
  quickMenuCloseTimer = null;
}

export function scheduleCloseJumpMenuOnHover(doc: Document): void {
  if (quickMenuPinned) return;
  cancelJumpMenuClose();
  quickMenuCloseTimer = window.setTimeout(() => {
    quickMenuCloseTimer = null;
    setJumpMenuVisible(doc, false);
  }, 250);
}

export function openJumpMenuOnHover(doc: Document): void {
  cancelJumpMenuClose();
  setJumpMenuVisible(doc, true);
}

export function closeJumpMenuOnOutsidePointer(doc: Document, container: Element): void {
  doc.addEventListener("pointerdown", (event) => {
    if (!container.contains(event.target as Node)) {
      setJumpMenuVisible(doc, false);
    }
  });
}
