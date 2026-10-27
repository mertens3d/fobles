import { CLASS, SELECTORS, TEXT } from "../../constants/fobles.constants";
import { getDebugSettings, onShowDeveloperButtonChange } from "../../shared/debug-settings";
import type { ToolbarPlacement } from "../toolbar.types";
import {
  isCompactToolbarPage,
  isPowerShellIsePath,
} from "../guard";
import { setJumpFlyoutVisible } from "./jump-flyout";
import { setProxyFlyoutVisible } from "./sc-proxy-buttons";
import {
  createLboltButton,
  createGraphButton,
  createAuditorButton,
  createDeveloperButton,
  createJumpsFlyoutTrigger,
  createSetIseTabTitleButton,
  createToolbarCloseButton,
  createToolbarGrip,
} from "./elements";
import { createProxyFlyoutTrigger } from "./proxy-flyout/proxy-flyout";
import { applyToolbarPlacement, wireContainerDragging } from "./drag";
import { observeToolbarBackground, updateToolbarBackground } from "./background";
import type { ToolbarContext } from "./types";
export type { ToolbarContext } from "./types";
let developerButtonContext: ToolbarContext | undefined;
let developerButtonListenerRegistered = false;
async function syncDeveloperButton(context: ToolbarContext): Promise<void> {
  const { showDeveloperButton } = await getDebugSettings();
  const body = context.doc.querySelector(SELECTORS.TOOLBAR_BODY);
  const existing = body?.querySelector(SELECTORS.TOOLBAR_DEVELOPER_BUTTON);
  const shouldShow = showDeveloperButton && !isCompactToolbarPage(context.win.location.pathname);
  if (body && shouldShow && !existing) {
    body.insertBefore(createDeveloperButton(context), body.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON));
  } else if (existing && !shouldShow) {
    existing.remove();
  }
}
// AI NOTE: The Developer button's visibility is an async storage setting, but injectToolbar is synchronous and idempotent.
// AI NOTE: So it is added or removed after the fact, on every inject and whenever the setting changes.
function watchDeveloperButton(context: ToolbarContext): void {
  developerButtonContext = context;
  if (!developerButtonListenerRegistered) {
    developerButtonListenerRegistered = true;
    onShowDeveloperButtonChange(() => {
      if (developerButtonContext) void syncDeveloperButton(developerButtonContext);
    });
  }
  void syncDeveloperButton(context);
}
export function injectToolbar(context: ToolbarContext): void {
  const host = context.doc.body;
  if (!host) return;
  let container = context.doc.querySelector<HTMLDivElement>(
    SELECTORS.TOOLBAR_CONTAINER,
  );
  if (!container) {
    container = context.doc.createElement("div");
    container.className = CLASS.TOOLBAR_CONTAINER;
    container.title = TEXT.DRAG_NAV;
  }
  if (!container.querySelector(SELECTORS.TOOLBAR_GRIP)) {
    container.appendChild(createToolbarGrip(context));
  }
  let body = container.querySelector(SELECTORS.TOOLBAR_BODY);
  if (!body) {
    body = context.doc.createElement("div");
    body.className = CLASS.TOOLBAR_BODY;
    container.appendChild(body);
  }
  wireContainerDragging(context, container);
  const isCompactToolbar = isCompactToolbarPage(context.win.location.pathname);
  if (!body.querySelector(`.${CLASS.TOOLBAR_LBOLT_BUTTON.split(" ").join(".")}`)) {
    body.appendChild(createLboltButton(context));
  }
  if (isCompactToolbar) {
    body.querySelector(SELECTORS.TOOLBAR_GRAPH_BUTTON)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_AUDITOR_BUTTON)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_DEVELOPER_BUTTON)?.remove();
    body.querySelector(SELECTORS.JUMP_FLYOUT_TRIGGER)?.remove();
    body.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_SET_ISE_TITLE_BUTTON)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON)?.remove();
    if (container.parentElement !== host) host.appendChild(container);
    applyToolbarPlacement(container, context.win, context.placement);
    updateToolbarBackground(context);
    return;
  }
  if (!body.querySelector(SELECTORS.JUMP_FLYOUT_TRIGGER)) {
    body.appendChild(createJumpsFlyoutTrigger(context));
  }
  if (!body.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)) {
    body.appendChild(createProxyFlyoutTrigger(context));
  }
  if (!body.querySelector(SELECTORS.TOOLBAR_GRAPH_BUTTON)) {
    body.appendChild(createGraphButton(context));
  }
  if (!body.querySelector(SELECTORS.TOOLBAR_AUDITOR_BUTTON)) {
    body.appendChild(createAuditorButton(context));
  }
  const setIseTitleButton = body.querySelector(
    SELECTORS.TOOLBAR_SET_ISE_TITLE_BUTTON,
  );
  if (isPowerShellIsePath(context.win.location.pathname)) {
    if (!setIseTitleButton) body.appendChild(createSetIseTabTitleButton(context));
  } else {
    setIseTitleButton?.remove();
  }
  if (!body.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON)) {
    body.appendChild(createToolbarCloseButton(context));
  }
  if (container.parentElement !== host) host.appendChild(container);
  applyToolbarPlacement(container, context.win, context.placement);
  updateToolbarBackground(context);
  observeToolbarBackground(context);
  setJumpFlyoutVisible(context.doc, false);
  setProxyFlyoutVisible(context.doc, false);
  watchDeveloperButton(context);
}
export function setToolbarVisible(
  context: ToolbarContext,
  visible: boolean,
): void {
  context.setVisible(visible);
  if (visible) {
    injectToolbar(context);
    return;
  }
  setJumpFlyoutVisible(context.doc, false);
  setProxyFlyoutVisible(context.doc, false);
  context.doc.querySelector(SELECTORS.TOOLBAR_CONTAINER)?.remove();
}
export function setToolbarPlacement(
  context: ToolbarContext,
  placement: ToolbarPlacement,
): void {
  context.setPlacement(placement);
  const container = context.doc.querySelector<HTMLElement>(
    SELECTORS.TOOLBAR_CONTAINER,
  );
  if (container) {
    applyToolbarPlacement(container, context.win, placement);
  }
}
