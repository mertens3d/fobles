import { TEXT } from "../../constants";
import { createFlyoutGroup as createJumpFlyoutGroup } from "./group-builder";
import {
  getUserAdminPages,
  onUserAdminPagesChanged,
  type UserAdminPage,
} from "../../../shared/jump-flyout/user-admin-page-settings";
import type { FlyoutOption } from "../../../shared/jump-flyout/jump-flyout.types";

function toFlyoutOption(entry: UserAdminPage): FlyoutOption {
  return {
    id: entry.id,
    label: entry.label,
    url: entry.url,
    icon: entry.icon,
  };
}

// Appends a live-updating "User Admin Pages" group to the Admin Pages column. Rebuilt from scratch
// on every settings change (rather than toggling fixed rows like button-visibility.ts does) since
// this list can grow or shrink, unlike the fixed catalog's known-in-advance button set.
export function initUserAdminPageGroup(
  doc: Document,
  column: HTMLDivElement,
  closeMenu: () => void,
): void {
  const wrapper = doc.createElement("div");
  column.appendChild(wrapper);

  const render = (entries: UserAdminPage[]): void => {
    wrapper.textContent = "";
    const enabledEntries = entries.filter((entry) => entry.enabled);
    // No group heading at all when nothing is configured (or everything's hidden) - "under Admin
    // Pages" shouldn't show an empty "User Admin Pages" title with nothing beneath it.
    if (enabledEntries.length === 0) return;

    wrapper.appendChild(
      createJumpFlyoutGroup(
        doc,
        { title: TEXT.GROUP_NAME.USER_ADMIN_PAGES, groupMembers: enabledEntries.map(toFlyoutOption) },
        closeMenu,
      ),
    );
  };

  void getUserAdminPages().then(render);
  onUserAdminPagesChanged(render);
}
