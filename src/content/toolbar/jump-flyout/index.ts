import { ATTRIBUTE, SELECTORS } from "../../../constants/fobles.constants";
import { setProxyFlyoutVisible } from "../sc-proxy-buttons";
import { setJumpFlyoutPinned } from "./handlers";
import { getOrCreateJumpFlyout } from "./flyout-builder";
import "./button-visibility";

export {
  isJumpFlyoutPinned,
  setJumpFlyoutPinned,
  openJumpFlyoutOnHover,
  scheduleCloseJumpFlyoutOnHover,
} from "./handlers";

export function isJumpFlyoutVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.JUMP_FLYOUT)?.getAttribute(ATTRIBUTE.DATA.KEY.VISIBLE) === "true";
}

export function setJumpFlyoutVisible(doc: Document, visible: boolean): void {
  const jumpFlyout = getOrCreateJumpFlyout(doc, () => setJumpFlyoutVisible(doc, false));
  jumpFlyout?.setAttribute(ATTRIBUTE.DATA.KEY.VISIBLE, visible ? "true" : "false");
  if (!visible) setJumpFlyoutPinned(doc, false);

  if (visible) setProxyFlyoutVisible(doc, false);
}
