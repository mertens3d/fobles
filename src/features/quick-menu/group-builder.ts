import { CLASS } from "../../extension/constants";
import { createMenuOptionRow } from "./button-builder";
import type { MenuGroup } from "./menu.types";

export function createMenuGroup(
  doc: Document,
  group: MenuGroup,
  closeMenu: () => void,
): HTMLDivElement {
  const wrapper = doc.createElement("div");
  wrapper.className = CLASS.QUICK_MENU_GROUP;

  if (group.title) {
    const heading = doc.createElement("div");
    heading.className = CLASS.QUICK_MENU_GROUP_TITLE;
    heading.textContent = group.title;
    wrapper.appendChild(heading);
  }

  const actions = doc.createElement("div");
  actions.className = CLASS.QUICK_MENU_ACTIONS;
  group.groupMembers
    .filter((option) => !option.isIncomplete)
    .forEach((option) => actions.appendChild(createMenuOptionRow(doc, option, closeMenu)));
  wrapper.appendChild(actions);
  return wrapper;
}
