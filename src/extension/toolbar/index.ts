import { CLASS, SELECTORS, TEXT, type ToolbarPlacement } from "../constants";
import {
  isFieldEditorDialogPath,
  isPowerShellIsePath,
  isSelectRenderingDialog,
} from "../menu-path";
import { setQuickMenuVisible } from "../../features/quick-menu";
import { setProxyButtonsVisible } from "../../features/proxy-buttons";
import {
  createFeatureButton,
  createProxyButtonsTrigger,
  createQuickMenuTrigger,
  createSetIseTabTitleButton,
  createToolbarCloseButton,
  createToolbarGrip,
} from "./elements";
import { applyToolbarPlacement, wireContainerDragging } from "./drag";
import { observeToolbarBackground, updateToolbarBackground } from "./background";
import type { ToolbarContext } from "./types";

export type { ToolbarContext } from "./types";

export function injectToolbar(context: ToolbarContext): void {
  const host = context.doc.body;
  if (!host) return;

  let container = context.doc.querySelector(
    SELECTORS.TOOLBAR_CONTAINER,
  ) as HTMLDivElement | null;
  if (!container) {
    container = context.doc.createElement("div");
    container.className = "fobles-toolbar-container";
    container.title = TEXT.DRAG_NAV;
  }

  if (!container.querySelector(SELECTORS.TOOLBAR_GRIP)) {
    container.appendChild(createToolbarGrip(context));
  }

  let body = container.querySelector(SELECTORS.TOOLBAR_BODY) as HTMLDivElement | null;
  if (!body) {
    body = context.doc.createElement("div");
    body.className = "fobles-toolbar-body";
    container.appendChild(body);
  }

  wireContainerDragging(context, container);

  const isCompactToolbar =
    isSelectRenderingDialog(context.win.location) ||
    isFieldEditorDialogPath(context.win.location.pathname);

  if (!body.querySelector(`.${CLASS.TOOLBAR_FEATURE_BUTTON.split(" ").join(".")}`)) {
    body.appendChild(createFeatureButton(context));
  }

  if (isCompactToolbar) {
    body.querySelector(SELECTORS.QUICK_MENU_TRIGGER)?.remove();
    body.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_SET_ISE_TITLE_BUTTON)?.remove();
    body.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON)?.remove();

    if (container.parentElement !== host) host.appendChild(container);
    applyToolbarPlacement(container, context.win, context.placement);
    updateToolbarBackground(context);
    return;
  }

  if (!body.querySelector(SELECTORS.QUICK_MENU_TRIGGER)) {
    body.appendChild(createQuickMenuTrigger(context));
  }

  if (!body.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)) {
    body.appendChild(createProxyButtonsTrigger(context));
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
  setQuickMenuVisible(context.doc, false);
  setProxyButtonsVisible(context.doc, false);
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

  setQuickMenuVisible(context.doc, false);
  setProxyButtonsVisible(context.doc, false);
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
