import { CLASS } from "../../../constants/fobles.constants";
import { createFlyoutGroup } from "./group-builder";
import type { FlyoutGroup } from "../../../shared/jump-flyout/jump-flyout.types";

export function createMenuColumn(
  doc: Document,
  title: string | undefined,
  groups: readonly FlyoutGroup[],
  closeMenu: () => void,
): HTMLDivElement {
  const column = doc.createElement("div");
  column.className = CLASS.JUMP_FLYOUT.COLUMN;

  if (title) {
    const heading = doc.createElement("div");
    heading.className = CLASS.JUMP_FLYOUT.COLUMN_TITLE;
    heading.textContent = title;
    column.appendChild(heading);
  }

  groups.forEach((group) => column.appendChild(createFlyoutGroup(doc, group, closeMenu)));
  return column;
}
