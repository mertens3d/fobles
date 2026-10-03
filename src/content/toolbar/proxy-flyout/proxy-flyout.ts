import { CLASS, ATTRIBUTE, TEXT } from "../../constants";
import { createFoblesNavButton } from "../elements";
import { toggleProxyButtons } from "../handlers";
import { openProxyButtonsOnHover, scheduleCloseProxyButtonsOnHover as scheduleCloseProxyFlyoutOnHover } from "../sc-proxy-buttons";
import { createFlyoutTrigger } from "../shared-flyout/shared-flyout";
import type { ToolbarContext } from "../types";


export function createProxyFlyoutTrigger(context: ToolbarContext): HTMLDivElement {
  const button = createFoblesNavButton(context, {
    className: CLASS.FOBLES_NAV_BUTTON,
    role: ATTRIBUTE.DATA.NAV_BUTTON_ROLE.PROXY_FLYOUT_TRIGGER,
    text: TEXT.VIEW,
    title: TEXT.VIEW_TITLE,
    onClick: () => toggleProxyButtons(context),
  });

  return createFlyoutTrigger(context, button, CLASS.PROXY_BUTTONS_TRIGGER, {
    open: () => openProxyButtonsOnHover(context.doc),
    scheduleClose: () => scheduleCloseProxyFlyoutOnHover(context.doc),
  });
}
