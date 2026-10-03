import { setJumpFlyoutVisible } from "./index";

let jumpFlyoutPinned = false;

export function isJumpFlyoutPinned(): boolean {
  return jumpFlyoutPinned;
}

export function setJumpFlyoutPinned(doc: Document, pinned: boolean): void {
  jumpFlyoutPinned = pinned;
  if (pinned) {
    setJumpFlyoutVisible(doc, true);
  }
}

let jumpFlyoutCloseTimer: number | null = null;

export function cancelJumpFlyoutClose(): void {
  if (jumpFlyoutCloseTimer === null) return;
  window.clearTimeout(jumpFlyoutCloseTimer);
  jumpFlyoutCloseTimer = null;
}

export function scheduleCloseJumpFlyoutOnHover(doc: Document): void {
  if (jumpFlyoutPinned) return;
  cancelJumpFlyoutClose();
  jumpFlyoutCloseTimer = window.setTimeout(() => {
    jumpFlyoutCloseTimer = null;
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
