import { CLASS } from "../../constants";
import { createMenuGroup } from "./group-builder";
import type { MenuGroup } from "./menu.types";

export function createMenuColumn(
  doc: Document,
  title: string | undefined,
  groups: readonly MenuGroup[],
  closeMenu: () => void,
): HTMLDivElement {
  const column = doc.createElement("div");
  column.className = CLASS.QUICK_MENU_COLUMN;

  if (title) {
    const heading = doc.createElement("div");
    heading.className = CLASS.QUICK_MENU_COLUMN_TITLE;
    heading.textContent = title;
    column.appendChild(heading);
  }

  groups.forEach((group) => column.appendChild(createMenuGroup(doc, group, closeMenu)));
  return column;
}
