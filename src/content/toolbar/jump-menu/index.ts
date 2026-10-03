import { ATTRIBUTE, SELECTORS } from "../../constants";
import { setProxyButtonsVisible } from "../proxy-buttons";
import { setJumpFlyoutPinned } from "./handlers";
import { getOrCreateJumpFlyout } from "./menu-builder";
import "./button-visibility";

export {
  isJumpFlyoutPinned,
  setJumpFlyoutPinned,
  openJumpFlyoutOnHover,
  scheduleCloseJumpFlyoutOnHover,
} from "./handlers";

export function isJumpFlyoutVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.JUMP_MENU_FLYOUT)?.getAttribute(ATTRIBUTE.DATA.KEY.VISIBLE) === "true";
}

export function setJumpFlyoutVisible(doc: Document, visible: boolean): void {
  const menu = getOrCreateJumpFlyout(doc, () => setJumpFlyoutVisible(doc, false));
  menu?.setAttribute(ATTRIBUTE.DATA.KEY.VISIBLE, visible ? "true" : "false");
  if (!visible) setJumpFlyoutPinned(doc, false);

  if (visible) setProxyButtonsVisible(doc, false);
}
