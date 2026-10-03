import { CLASS } from "../../constants";
import { createFlyoutOptionRow } from "./button-builder";
import type { FlyoutGroup } from "../../../shared/jump-flyout/jump-flyout.types";

export function createFlyoutGroup(
  doc: Document,
  group: FlyoutGroup,
  closeMenu: () => void,
): HTMLDivElement {
  const wrapper = doc.createElement("div");
  wrapper.className = CLASS.JUMP_FLYOUT.GROUP;

  if (group.title) {
    const heading = doc.createElement("div");
    heading.className = CLASS.JUMP_FLYOUT.GROUP_TITLE;
    heading.textContent = group.title;
    wrapper.appendChild(heading);
  }

  const actions = doc.createElement("div");
  actions.className = CLASS.JUMP_FLYOUT.ACTIONS;
  group.groupMembers
    .filter((option) => !option.isIncomplete)
    .forEach((option) => actions.appendChild(createFlyoutOptionRow(doc, option, closeMenu)));
  wrapper.appendChild(actions);
  return wrapper;
}
