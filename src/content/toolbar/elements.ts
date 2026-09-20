import {
  ATTRIBUTE,
  CLASS,
  ICONS,
  SELECTORS,
  SYMBOLS,
  TEXT,
} from "../constants";
import { getPowerShellIseScriptTitle } from "../ise-tab-title";
import {
  openQuickMenuOnHover,
  scheduleCloseQuickMenuOnHover,
} from "./quick-menu";
import {
  openProxyButtonsOnHover,
  scheduleCloseProxyButtonsOnHover,
} from "./proxy-buttons";
import { toggleProxyButtons, toggleQuickMenu } from "./handlers";
import type { ToolbarContext } from "./types";

const GRIP_ROWS = 5;
const GRIP_COLUMNS = [3, 9];
const GRIP_DOT_RADIUS = 1.3;

function createMenuTrigger(
  context: ToolbarContext,
  button: HTMLButtonElement,
  triggerClass: string,
  onHover: { open: () => void; scheduleClose: () => void },
): HTMLDivElement {
  const trigger = context.doc.createElement("div");
  trigger.className = triggerClass;
  trigger.appendChild(button);
  trigger.addEventListener("mouseenter", onHover.open);
  trigger.addEventListener("mouseleave", onHover.scheduleClose);
  return trigger;
}

function createFoblesNavButton(
  context: ToolbarContext,
  options: {
    className: string;
    text: string;
    title: string;
    onClick: (event: MouseEvent) => void;
  },
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = options.className;
  button.textContent = options.text;
  button.title = options.title;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLES_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.addEventListener("click", options.onClick);
  return button;
}

export function createQuickMenuTrigger(context: ToolbarContext): HTMLDivElement {
  const button = createFoblesNavButton(context, {
    className: CLASS.FOBLES_NAV_BUTTON,
    text: TEXT.QUICK_MENU,
    title: TEXT.QUICK_MENU_TITLE,
    onClick: () => toggleQuickMenu(context),
  });

  return createMenuTrigger(context, button, CLASS.QUICK_MENU_TRIGGER, {
    open: () => openQuickMenuOnHover(context.doc),
    scheduleClose: () => scheduleCloseQuickMenuOnHover(context.doc),
  });
}

export function createProxyButtonsTrigger(context: ToolbarContext): HTMLDivElement {
  const button = createFoblesNavButton(context, {
    className: CLASS.FOBLES_NAV_BUTTON,
    text: TEXT.VIEW,
    title: TEXT.VIEW_TITLE,
    onClick: () => toggleProxyButtons(context),
  });

  return createMenuTrigger(context, button, CLASS.PROXY_BUTTONS_TRIGGER, {
    open: () => openProxyButtonsOnHover(context.doc),
    scheduleClose: () => scheduleCloseProxyButtonsOnHover(context.doc),
  });
}

export function createLboltButton(context: ToolbarContext): HTMLButtonElement {
  return createFoblesNavButton(context, {
    className: CLASS.TOOLBAR_LBOLT_BUTTON,
    text: SYMBOLS.LIGHTNING,
    title: TEXT.TOGGLE_FEATURES,
    onClick: context.onToggleFeatures,
  });
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

export function createSetIseTabTitleButton(
  context: ToolbarContext,
): HTMLButtonElement {
  return createFoblesNavButton(context, {
    className: `${CLASS.FOBLES_NAV_BUTTON} ${CLASS.TOOLBAR_SET_ISE_TITLE_BUTTON}`,
    text: TEXT.SET_ISE_TAB_TITLE,
    title: TEXT.SET_ISE_TAB_TITLE_TITLE,
    onClick: () => {
      const title = getPowerShellIseScriptTitle(context.doc);
      if (!title) {
        context.win.alert(TEXT.SET_ISE_TAB_TITLE_ERROR);
        return;
      }

      context.doc.title = title;
    },
  });
}
