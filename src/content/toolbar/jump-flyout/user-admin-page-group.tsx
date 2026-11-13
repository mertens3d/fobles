// @source-path [fobles] src/content/toolbar/jump-flyout/user-admin-page-group.tsx

import { TEXT } from "../../../constants/fobles-b.const";
import type { UserAdminPage } from "../../../shared/jump-flyout/user-admin-page-settings";
import { JumpFlyoutGroup } from "./jump-flyout-group";
import { useUserAdminPages } from "./use-user-admin-pages";

function toFlyoutOption(entry: UserAdminPage) {
  return { id: entry.id, label: entry.label, url: entry.url, icon: entry.icon };
}

export type UserAdminPageGroupProps = { doc: Document; onOptionActivated: () => void };

// Rebuilt from scratch on every settings change (rather than toggling fixed rows like
// jump-flyout-option-button.tsx's own visibility does) since this list can grow or shrink, unlike
// the fixed catalog's known-in-advance button set.
export function UserAdminPageGroup({ doc, onOptionActivated }: UserAdminPageGroupProps) {
  const entries = useUserAdminPages();
  const enabledEntries = entries.filter((entry) => entry.enabled);
  // No group heading at all when nothing is configured (or everything's hidden) - "under Admin
  // Pages" shouldn't show an empty "User Admin Pages" title with nothing beneath it.
  if (enabledEntries.length === 0) {
    return null;
  }
  return (
    <JumpFlyoutGroup
      doc={doc}
      group={{ title: TEXT.GROUP_NAME.USER_ADMIN_PAGES, groupMembers: enabledEntries.map(toFlyoutOption) }}
      onOptionActivated={onOptionActivated}
    />
  );
}
