import { ATTRIBUTE, CLASS } from "../../constants";
import { createFoblesButton } from "../../features/augmentor/helper";
import { buildFlyoutOptionUrl } from "./flyout-option-url";
import { registerButtonRow } from "./button-visibility";
import type { FlyoutOption } from "../../../shared/jump-flyout/jump-flyout.types";

function addIcon(doc: Document, button: HTMLButtonElement, option: FlyoutOption): void {
  const iconBox = doc.createElement("span");
  iconBox.className = CLASS.JUMP_FLYOUT.OPTION_ICON_BOX;
  const icon = doc.createElement(option.icon ? "img" : "span");
  icon.className = CLASS.JUMP_FLYOUT.OPTION_ICON;
  if (option.icon) {
    (icon as HTMLImageElement).src = option.icon;
    (icon as HTMLImageElement).alt = "";
  }
  iconBox.appendChild(icon);
  button.appendChild(iconBox);
}

function addLabel(doc: Document, button: HTMLButtonElement, option: FlyoutOption): void {
  const label = doc.createElement("span");
  label.className = CLASS.JUMP_FLYOUT.OPTION_LABEL;
  label.textContent = option.label;
  button.appendChild(label);
}

function addBadge(doc: Document, button: HTMLButtonElement, option: FlyoutOption): void {
  if (!option.isXPOnly && !option.isAIOnly) return;

  const badge = doc.createElement("span");
  badge.className = CLASS.JUMP_FLYOUT.OPTION_BADGE;
  badge.textContent = option.isXPOnly ? "XP" : "AI";
  button.appendChild(badge);
}

function addDatasetAttributes(button: HTMLButtonElement, option: FlyoutOption): void {
  if (option.path !== undefined) {
    button.dataset.foblesTreeJumpPath = option.path;
  }
  if (option.url !== undefined) {
    button.dataset.foblesMenuUrl = option.url;
  }
}

// Wires the option's own action (if any) plus the shared "clicking any option closes the jump flyout" behavior.
// closeMenu is threaded down from index.ts so this file never has to import setJumpFlyoutVisible.
function addEvent(
  doc: Document,
  button: HTMLButtonElement,
  option: FlyoutOption,
  closeJumpFlyout: () => void,
): void {
  if (option.action) {
    button.onclick = (event) => {
      event.preventDefault();
      option.action?.(doc);
    };
  }

  button.addEventListener("click", closeJumpFlyout, { capture: true });
}

function createFlyoutOptionButton(
  doc: Document,
  option: FlyoutOption,
  closeJumpFlyout: () => void,
): HTMLButtonElement {
  const button = createFoblesButton(
    doc,
    option.label,
    () => buildFlyoutOptionUrl(doc, option),
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
  addEvent(doc, button, option, closeJumpFlyout);

  return button;
}

export function createFlyoutOptionRow(
  doc: Document,
  option: FlyoutOption,
  closeJumpFlyout: () => void,
): HTMLDivElement {
  const row = doc.createElement("div");
  row.className = CLASS.JUMP_FLYOUT.ACTION;
  row.appendChild(createFlyoutOptionButton(doc, option, closeJumpFlyout));
  registerButtonRow(option.id, row);
  return row;
}
