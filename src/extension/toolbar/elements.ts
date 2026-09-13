import {
  ATTRIBUTE,
  CLASS,
  ICONS,
  SELECTORS,
  SYMBOLS,
  TEXT,
} from "../constants";
import {
  openQuickMenuOnHover,
  scheduleCloseQuickMenuOnHover,
} from "../../features/quick-menu";
import {
  openProxyButtonsOnHover,
  scheduleCloseProxyButtonsOnHover,
} from "../../features/proxy-buttons";
import { toggleProxyButtons, toggleQuickMenu } from "./handlers";
import type { ToolbarContext } from "./types";

const GRIP_ROWS = 5;
const GRIP_COLUMNS = [3, 9];
const GRIP_DOT_RADIUS = 1.3;

function createMenuTrigger(
  context: ToolbarContext,
  button: HTMLButtonElement,
  triggerClass: string,
): HTMLDivElement {
  const trigger = context.doc.createElement("div");
  trigger.className = triggerClass;
  trigger.appendChild(button);
  return trigger;
}

export function createQuickMenuTrigger(context: ToolbarContext): HTMLDivElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.FOBLE_NAV_BUTTON;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.textContent = TEXT.QUICK_MENU;
  button.title = TEXT.QUICK_MENU_TITLE;
  button.addEventListener("click", () => toggleQuickMenu(context));

  const trigger = createMenuTrigger(context, button, CLASS.QUICK_MENU_TRIGGER);
  trigger.addEventListener("mouseenter", () => openQuickMenuOnHover(context.doc));
  trigger.addEventListener("mouseleave", () => scheduleCloseQuickMenuOnHover(context.doc));
  return trigger;
}

export function createProxyButtonsTrigger(context: ToolbarContext): HTMLDivElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.FOBLE_NAV_BUTTON;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.textContent = TEXT.VIEW;
  button.title = TEXT.VIEW_TITLE;
  button.addEventListener("click", () => toggleProxyButtons(context));

  const trigger = createMenuTrigger(context, button, CLASS.PROXY_BUTTONS_TRIGGER);
  trigger.addEventListener("mouseenter", () => openProxyButtonsOnHover(context.doc));
  trigger.addEventListener("mouseleave", () => scheduleCloseProxyButtonsOnHover(context.doc));
  return trigger;
}

export function createFeatureButton(context: ToolbarContext): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.TOOLBAR_FEATURE_BUTTON;
  button.textContent = SYMBOLS.LIGHTNING;
  button.title = TEXT.TOGGLE_FEATURES;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.addEventListener("click", context.onToggleFeatures);
  return button;
}

export function createToolbarCloseButton(
  context: ToolbarContext,
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.TOOLBAR_CLOSE_BUTTON;
  button.title = TEXT.HIDE_NAV;
  button.setAttribute("aria-label", TEXT.HIDE_NAV);

  const icon = context.doc.createElement("img");
  icon.className = CLASS.TOOLBAR_CLOSE_ICON;
  icon.src = ICONS.CLOSE;
  icon.alt = "";
  button.appendChild(icon);

  button.addEventListener("click", () => context.setVisible(false));
  return button;
}

export function createToolbarGrip(context: ToolbarContext): SVGSVGElement {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = context.doc.createElementNS(svgNs, "svg") as SVGSVGElement;
  svg.setAttribute("class", CLASS.TOOLBAR_GRIP);
  svg.setAttribute("viewBox", "0 0 12 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const rowSpacing = 24 / (GRIP_ROWS + 1);
  for (let row = 1; row <= GRIP_ROWS; row += 1) {
    for (const x of GRIP_COLUMNS) {
      const dot = context.doc.createElementNS(svgNs, "circle");
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(rowSpacing * row));
      dot.setAttribute("r", String(GRIP_DOT_RADIUS));
      dot.setAttribute("fill", "currentColor");
      svg.appendChild(dot);
    }
  }

  return svg;
}

function getPowerShellIseScriptTitle(doc: Document): string | null {
  const scriptName = doc
    .querySelector(SELECTORS.SITECORE_SCRIPT_NAME)
    ?.textContent
    ?.trim();
  return scriptName?.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

export function createSetIseTabTitleButton(
  context: ToolbarContext,
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = `${CLASS.FOBLE_NAV_BUTTON} ${CLASS.TOOLBAR_SET_ISE_TITLE_BUTTON}`;
  button.textContent = TEXT.SET_ISE_TAB_TITLE;
  button.title = TEXT.SET_ISE_TAB_TITLE_TITLE;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.addEventListener("click", () => {
    const title = getPowerShellIseScriptTitle(context.doc);
    if (!title) {
      context.win.alert(TEXT.SET_ISE_TAB_TITLE_ERROR);
      return;
    }

    context.doc.title = title;
  });
  return button;
}
