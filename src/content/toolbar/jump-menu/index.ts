import { ATTRIBUTE, SELECTORS } from "../../constants";
import { setProxyButtonsVisible } from "../proxy-buttons";
import { setJumpMenuPinned } from "./handlers";
import { getOrCreateJumpMenu } from "./menu-builder";
import "./button-visibility";

export {
  isJumpMenuPinned,
  setJumpMenuPinned,
  openJumpMenuOnHover,
  scheduleCloseJumpMenuOnHover,
} from "./handlers";

export function isJumpMenuVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.JUMP_MENU_FLYOUT)?.getAttribute(ATTRIBUTE.DATA.KEY.VISIBLE) === "true";
}

export function setJumpMenuVisible(doc: Document, visible: boolean): void {
  const menu = getOrCreateJumpMenu(doc, () => setJumpMenuVisible(doc, false));
  menu?.setAttribute(ATTRIBUTE.DATA.KEY.VISIBLE, visible ? "true" : "false");
  if (!visible) setJumpMenuPinned(doc, false);

  if (visible) setProxyButtonsVisible(doc, false);
}
