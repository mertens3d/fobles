import {
  isQuickMenuPinned,
  setQuickMenuPinned,
  setQuickMenuVisible,
} from "../../features/quick-menu";
import {
  isProxyButtonsPinned,
  setProxyButtonsPinned,
  setProxyButtonsVisible,
} from "../../features/proxy-buttons";
import type { ToolbarContext } from "./types";

export function toggleQuickMenu(context: ToolbarContext): void {
  if (isQuickMenuPinned()) {
    setQuickMenuPinned(context.doc, false);
    setQuickMenuVisible(context.doc, false);
    return;
  }
  setQuickMenuPinned(context.doc, true);
}

export function toggleProxyButtons(context: ToolbarContext): void {
  if (isProxyButtonsPinned()) {
    setProxyButtonsPinned(context.doc, false);
    setProxyButtonsVisible(context.doc, false);
    return;
  }
  setProxyButtonsPinned(context.doc, true);
}
