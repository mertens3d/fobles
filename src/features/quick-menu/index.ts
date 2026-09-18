import { SELECTORS } from "../../extension/constants";
import { setProxyButtonsVisible } from "../proxy-buttons";
import { setQuickMenuPinned } from "./handlers";
import { getOrCreateQuickMenu } from "./menu-builder";
import "./button-visibility";

export { resumeKickAllUsers } from "./kick-users";
export { QUICK_MENU_BUTTON_ID } from "./button-ids";
export {
  getQuickMenuButtonSettings,
  sanitizeQuickMenuPathSuffix,
  setQuickMenuButtonSettings,
  type QuickMenuButtonSetting,
  type QuickMenuButtonSettings,
} from "./button-settings";
export {
  isQuickMenuPinned,
  setQuickMenuPinned,
  openQuickMenuOnHover,
  scheduleCloseQuickMenuOnHover,
} from "./handlers";
export { QUICK_MENU_BUTTON_CATALOG, type QuickMenuButtonDescriptor } from "./button-catalog";

export function isQuickMenuVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.QUICK_MENU)?.getAttribute("data-visible") === "true";
}

export function setQuickMenuVisible(doc: Document, visible: boolean): void {
  const menu = getOrCreateQuickMenu(doc, () => setQuickMenuVisible(doc, false));
  menu?.setAttribute("data-visible", visible ? "true" : "false");
  if (!visible) setQuickMenuPinned(doc, false);

  if (visible) setProxyButtonsVisible(doc, false);
}
