import { ATTRIBUTE, CLASS } from "../../constants";
import { createFoblesButton } from "../../features/augmentor/helper";
import { buildMenuOptionUrl } from "./menu-option-url";
import { registerButtonRow } from "./button-visibility";
import type { MenuOption } from "../../../shared/quick-menu/menu.types";

function addIcon(doc: Document, button: HTMLButtonElement, option: MenuOption): void {
  const iconBox = doc.createElement("span");
  iconBox.className = CLASS.QUICK_MENU_OPTION_ICON_BOX;
  const icon = doc.createElement(option.icon ? "img" : "span");
  icon.className = CLASS.QUICK_MENU_OPTION_ICON;
  if (option.icon) {
    (icon as HTMLImageElement).src = option.icon;
    (icon as HTMLImageElement).alt = "";
  }
  iconBox.appendChild(icon);
  button.appendChild(iconBox);
}

function addLabel(doc: Document, button: HTMLButtonElement, option: MenuOption): void {
  const label = doc.createElement("span");
  label.className = CLASS.QUICK_MENU_OPTION_LABEL;
  label.textContent = option.label;
  button.appendChild(label);
}

function addBadge(doc: Document, button: HTMLButtonElement, option: MenuOption): void {
  if (!option.isXPOnly && !option.isAIOnly) return;

  const badge = doc.createElement("span");
  badge.className = CLASS.QUICK_MENU_OPTION_BADGE;
  badge.textContent = option.isXPOnly ? "XP" : "AI";
  button.appendChild(badge);
}

function addDatasetAttributes(button: HTMLButtonElement, option: MenuOption): void {
  if (option.path !== undefined) {
    button.dataset.foblesTreeJumpPath = option.path;
  }
  if (option.url !== undefined) {
    button.dataset.foblesMenuUrl = option.url;
  }
}

// Wires the option's own action (if any) plus the shared "clicking any option closes the menu" behavior.
// closeMenu is threaded down from index.ts so this file never has to import setQuickMenuVisible.
function addEvent(
  doc: Document,
  button: HTMLButtonElement,
  option: MenuOption,
  closeMenu: () => void,
): void {
  if (option.action) {
    button.onclick = (event) => {
      event.preventDefault();
      option.action?.(doc);
    };
  }

  button.addEventListener("click", closeMenu, { capture: true });
}

function createMenuOptionButton(
  doc: Document,
  option: MenuOption,
  closeMenu: () => void,
): HTMLButtonElement {
  const button = createFoblesButton(
    doc,
    option.label,
    () => buildMenuOptionUrl(doc, option),
    {
      attrName: ATTRIBUTE.DATA.KEY.FOBLES_NAV_OWNER,
      attrValue: "1",
      classNames: [CLASS.FOBLES_NAV_BUTTON, CLASS.FOBLES_NAV_BUTTON_COMPACT],
    },
  );

  // Split the plain-text button into an outlined icon box + a pill-styled label so the
  // icon isn't tinted by the fobles background, with a straight divider between them.
  button.textContent = "";
  addIcon(doc, button, option);
  addLabel(doc, button, option);
  addBadge(doc, button, option);
  addDatasetAttributes(button, option);
  addEvent(doc, button, option, closeMenu);

  return button;
}

export function createMenuOptionRow(
  doc: Document,
  option: MenuOption,
  closeMenu: () => void,
): HTMLDivElement {
  const row = doc.createElement("div");
  row.className = CLASS.QUICK_MENU_ACTION;
  row.appendChild(createMenuOptionButton(doc, option, closeMenu));
  registerButtonRow(option.id, row);
  return row;
}
