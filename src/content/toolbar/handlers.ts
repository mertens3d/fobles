import {
  isJumpMenuPinned,
  setJumpMenuPinned,
  setJumpMenuVisible,
} from "./jump-menu";
import {
  isProxyButtonsPinned,
  setProxyButtonsPinned,
  setProxyButtonsVisible,
} from "./proxy-buttons";
import type { ToolbarContext } from "./types";

export function toggleJumpMenu(context: ToolbarContext): void {
  if (isJumpMenuPinned()) {
    setJumpMenuPinned(context.doc, false);
    setJumpMenuVisible(context.doc, false);
    return;
  }
  setJumpMenuPinned(context.doc, true);
}

export function toggleProxyButtons(context: ToolbarContext): void {
  if (isProxyButtonsPinned()) {
    setProxyButtonsPinned(context.doc, false);
    setProxyButtonsVisible(context.doc, false);
    return;
  }
  setProxyButtonsPinned(context.doc, true);
}
