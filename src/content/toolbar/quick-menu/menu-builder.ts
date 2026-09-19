import { CLASS, SELECTORS, TEXT } from "../../constants";
import {
  cancelQuickMenuClose,
  closeQuickMenuOnOutsidePointer,
  scheduleCloseQuickMenuOnHover,
} from "./handlers";
import { createMenuColumn } from "./column-builder";
import {
  ADMIN_PAGE_GROUP,
  AI_GROUP,
  APPLICATION_PAGE_GROUP,
  THIRD_PARTY_GROUP,
  TREE_JUMP_GROUP,
} from "../../../shared/quick-menu/menu-groups";

function createQuickMenu(doc: Document, closeMenu: () => void): HTMLDivElement {
  const menu = doc.createElement("div");
  menu.className = CLASS.QUICK_MENU;
  menu.setAttribute("data-quick-menu", "1");

  const columns = doc.createElement("div");
  columns.className = CLASS.QUICK_MENU_COLUMNS;
  columns.appendChild(createMenuColumn(doc, TEXT.GROUP_NAME.TREE_JUMPS, TREE_JUMP_GROUP, closeMenu));
  columns.appendChild(
    createMenuColumn(
      doc,
      TEXT.GROUP_NAME.ADMIN_PAGES,
      [...ADMIN_PAGE_GROUP, AI_GROUP, THIRD_PARTY_GROUP],
      closeMenu,
    ),
  );
  // Omits a column title: the sole group in this column already renders its own title.
  columns.appendChild(createMenuColumn(doc, undefined, [APPLICATION_PAGE_GROUP], closeMenu));
  menu.appendChild(columns);
  return menu;
}

// closeMenu is supplied by the caller (index.ts) so this file never has to import setQuickMenuVisible.
export function getOrCreateQuickMenu(doc: Document, closeMenu: () => void): HTMLDivElement | null {
  const trigger = doc.querySelector(SELECTORS.QUICK_MENU_TRIGGER);
  if (!trigger) return null;

  const existing = trigger.querySelector(SELECTORS.QUICK_MENU) as HTMLDivElement | null;
  if (existing) return existing;

  const menu = createQuickMenu(doc, closeMenu);
  // The panel renders outside the trigger's own hit box, so bridge the gap with a
  // close delay instead of relying on the trigger's mouseleave alone.
  menu.addEventListener("mouseenter", cancelQuickMenuClose);
  menu.addEventListener("mouseleave", () => scheduleCloseQuickMenuOnHover(doc));
  trigger.appendChild(menu);
  closeQuickMenuOnOutsidePointer(doc, trigger);
  return menu;
}
