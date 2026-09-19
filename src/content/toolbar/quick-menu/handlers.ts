import { setQuickMenuVisible } from "./index";

let quickMenuPinned = false;

export function isQuickMenuPinned(): boolean {
  return quickMenuPinned;
}

export function setQuickMenuPinned(doc: Document, pinned: boolean): void {
  quickMenuPinned = pinned;
  if (pinned) setQuickMenuVisible(doc, true);
}

let quickMenuCloseTimer: number | null = null;

export function cancelQuickMenuClose(): void {
  if (quickMenuCloseTimer === null) return;
  window.clearTimeout(quickMenuCloseTimer);
  quickMenuCloseTimer = null;
}

export function scheduleCloseQuickMenuOnHover(doc: Document): void {
  if (quickMenuPinned) return;
  cancelQuickMenuClose();
  quickMenuCloseTimer = window.setTimeout(() => {
    quickMenuCloseTimer = null;
    setQuickMenuVisible(doc, false);
  }, 250);
}

export function openQuickMenuOnHover(doc: Document): void {
  cancelQuickMenuClose();
  setQuickMenuVisible(doc, true);
}

export function closeQuickMenuOnOutsidePointer(doc: Document, container: Element): void {
  doc.addEventListener("pointerdown", (event) => {
    if (!container.contains(event.target as Node)) {
      setQuickMenuVisible(doc, false);
    }
  });
}
