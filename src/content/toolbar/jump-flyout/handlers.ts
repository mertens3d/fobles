import { setJumpFlyoutVisible } from "./index";

let quickMenuPinned = false;

export function isJumpFlyoutPinned(): boolean {
  return quickMenuPinned;
}

export function setJumpFlyoutPinned(doc: Document, pinned: boolean): void {
  quickMenuPinned = pinned;
  if (pinned) setJumpFlyoutVisible(doc, true);
}

let quickMenuCloseTimer: number | null = null;

export function cancelJumpFlyoutClose(): void {
  if (quickMenuCloseTimer === null) return;
  window.clearTimeout(quickMenuCloseTimer);
  quickMenuCloseTimer = null;
}

export function scheduleCloseJumpFlyoutOnHover(doc: Document): void {
  if (quickMenuPinned) return;
  cancelJumpFlyoutClose();
  quickMenuCloseTimer = window.setTimeout(() => {
    quickMenuCloseTimer = null;
    setJumpFlyoutVisible(doc, false);
  }, 250);
}

export function openJumpFlyoutOnHover(doc: Document): void {
  cancelJumpFlyoutClose();
  setJumpFlyoutVisible(doc, true);
}

export function closeJumpFlyoutOnOutsidePointer(doc: Document, container: Element): void {
  doc.addEventListener("pointerdown", (event) => {
    if (!container.contains(event.target as Node)) {
      setJumpFlyoutVisible(doc, false);
    }
  });
}
