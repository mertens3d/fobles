import { SELECTORS } from "../../constants";
import { setProxyButtonsVisible } from "../proxy-buttons";
import { setQuickMenuPinned } from "./handlers";
import { getOrCreateQuickMenu } from "./menu-builder";
import "./button-visibility";

export {
  isQuickMenuPinned,
  setQuickMenuPinned,
  openQuickMenuOnHover,
  scheduleCloseQuickMenuOnHover,
} from "./handlers";

export function isQuickMenuVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.QUICK_MENU)?.getAttribute("data-visible") === "true";
}

export function setQuickMenuVisible(doc: Document, visible: boolean): void {
  const menu = getOrCreateQuickMenu(doc, () => setQuickMenuVisible(doc, false));
  menu?.setAttribute("data-visible", visible ? "true" : "false");
  if (!visible) setQuickMenuPinned(doc, false);

  if (visible) setProxyButtonsVisible(doc, false);
}
