import {
  isJumpFlyoutPinned,
  setJumpFlyoutPinned,
  setJumpFlyoutVisible,
} from "./jump-flyout";
import {
  isProxyButtonsPinned,
  setProxyButtonsPinned,
  setProxyButtonsVisible,
} from "./sc-proxy-buttons";
import type { ToolbarContext } from "./types";

export function toggleJumpFlyout(context: ToolbarContext): void {
  if (isJumpFlyoutPinned()) {
    setJumpFlyoutPinned(context.doc, false);
    setJumpFlyoutVisible(context.doc, false);
    return;
  }
  setJumpFlyoutPinned(context.doc, true);
}

export function toggleProxyButtons(context: ToolbarContext): void {
  if (isProxyButtonsPinned()) {
    setProxyButtonsPinned(context.doc, false);
    setProxyButtonsVisible(context.doc, false);
    return;
  }
  setProxyButtonsPinned(context.doc, true);
}
