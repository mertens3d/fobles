import { ATTRIBUTE, CLASS, SELECTORS, TEXT } from "../../../constants/fobles.constants";
import {
  cancelJumpFlyoutClose,
  closeJumpFlyoutOnOutsidePointer,
  scheduleCloseJumpFlyoutOnHover,
} from "./handlers";
import { createMenuColumn } from "./column-builder";
import { initUserTreeJumpGroup } from "./user-tree-jump-group";
import { initUserAdminPageGroup } from "./user-admin-page-group";
import {
  ADMIN_PAGE_GROUP,
  AI_GROUP,
  APPLICATION_PAGE_GROUP,
  THIRD_PARTY_GROUP,
  TREE_JUMP_GROUP
} from "../../../constants/flyout-groups";

function createJumpFlyout(doc: Document, closeMenu: () => void): HTMLDivElement {
  const jumpFlyout = doc.createElement("div");
  jumpFlyout.className = CLASS.JUMP_FLYOUT.FLYOUT;
  jumpFlyout.setAttribute(ATTRIBUTE.DATA.KEY.JUMP_MENU, "1");

  const columns = doc.createElement("div");
  columns.className = CLASS.JUMP_FLYOUT.COLUMNS;
  const treeJumpsColumn = createMenuColumn(doc, TEXT.GROUP_NAME.TREE_JUMPS, TREE_JUMP_GROUP, closeMenu);
  initUserTreeJumpGroup(doc, treeJumpsColumn, closeMenu);
  columns.appendChild(treeJumpsColumn);
  const adminPagesColumn = createMenuColumn(
    doc,
    TEXT.GROUP_NAME.ADMIN_PAGES,
    [...ADMIN_PAGE_GROUP, AI_GROUP, THIRD_PARTY_GROUP],
    closeMenu,
  );
  initUserAdminPageGroup(doc, adminPagesColumn, closeMenu);
  columns.appendChild(adminPagesColumn);
  // Omits a column title: the sole group in this column already renders its own title.
  columns.appendChild(createMenuColumn(doc, undefined, [APPLICATION_PAGE_GROUP], closeMenu));
  jumpFlyout.appendChild(columns);
  return jumpFlyout;
}

// closeMenu is supplied by the caller (index.ts) so this file never has to import setJumpFlyoutVisible.
export function getOrCreateJumpFlyout(doc: Document, closeMenu: () => void): HTMLDivElement | null {
  const trigger = doc.querySelector(SELECTORS.JUMP_FLYOUT_TRIGGER);
  if (!trigger) return null;

  const existing = trigger.querySelector<HTMLDivElement>(SELECTORS.JUMP_FLYOUT);
  if (existing) return existing;

  const jumpFlyout = createJumpFlyout(doc, closeMenu);
  // The panel renders outside the trigger's own hit box, so bridge the gap with a
  // close delay instead of relying on the trigger's mouseleave alone.
  jumpFlyout.addEventListener("mouseenter", cancelJumpFlyoutClose);
  jumpFlyout.addEventListener("mouseleave", () => scheduleCloseJumpFlyoutOnHover(doc));
  trigger.appendChild(jumpFlyout);
  closeJumpFlyoutOnOutsidePointer(doc, trigger);
  return jumpFlyout;
}
