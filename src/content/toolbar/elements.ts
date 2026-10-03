import {
  ATTRIBUTE,
  CLASS,
  ICONS,
  SYMBOLS,
  TEXT,
} from "../constants";
import { getPowerShellIseScriptTitle } from "../ise-tab-title";
import {
  openJumpFlyoutOnHover,
  scheduleCloseJumpFlyoutOnHover,
} from "./jump-flyout";
import { toggleJumpFlyout } from "./handlers";
import type { ToolbarContext } from "./types";
import { createFlyoutTrigger } from "./shared-flyout/shared-flyout";

const GRIP_ROWS = 5;
const GRIP_COLUMNS = [3, 9];
const GRIP_DOT_RADIUS = 1.3;

export function createFoblesNavButton(
  context: ToolbarContext,
  options: {
    className: string;
    role?: string;
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
  if (options.role) {
    button.setAttribute(ATTRIBUTE.DATA.KEY.NAV_BUTTON_ROLE, options.role);
  }
  button.addEventListener("click", options.onClick);
  return button;
}

export function createJumpsFlyoutTrigger(context: ToolbarContext): HTMLDivElement {
  const button = createFoblesNavButton(context, {
    className: CLASS.FOBLES_NAV_BUTTON,
    role: ATTRIBUTE.DATA.NAV_BUTTON_ROLE.JUMPS_FLYOUT_TRIGGER,
    text: TEXT.JUMP_MENU,
    title: TEXT.QUICK_MENU_TITLE,
    onClick: () => toggleJumpFlyout(context),
  });

  return createFlyoutTrigger(context, button, CLASS.JUMP_FLYOUT.TRIGGER, {
    open: () => openJumpFlyoutOnHover(context.doc),
    scheduleClose: () => scheduleCloseJumpFlyoutOnHover(context.doc),
  });
}

export function createLboltButton(context: ToolbarContext): HTMLButtonElement {
  return createFoblesNavButton(context, {
    className: CLASS.TOOLBAR_LBOLT_BUTTON,
    role: ATTRIBUTE.DATA.NAV_BUTTON_ROLE.LBOLT,
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
  const svg = context.doc.createElementNS(svgNs, "svg");
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
