// @source-path [fobles] src/content/toolbar/jump-flyout/user-tree-jump-group.tsx

import { TEXT } from "../../../constants/fobles.constants";
import { buildUserTreeJumpPath, type UserTreeJump } from "../../../shared/jump-flyout/user-tree-jump-settings";
import { JumpFlyoutGroup } from "./jump-flyout-group";
import { useUserTreeJumps } from "./use-user-tree-jumps";

function toFlyoutOption(entry: UserTreeJump) {
  return { id: entry.id, label: entry.label, path: buildUserTreeJumpPath(entry.pathSuffix), icon: entry.icon };
}

export type UserTreeJumpGroupProps = { doc: Document; onOptionActivated: () => void };

// Rebuilt from scratch on every settings change (rather than toggling fixed rows like
// jump-flyout-option-button.tsx's own visibility does) since this list can grow or shrink, unlike
// the fixed catalog's known-in-advance button set.
export function UserTreeJumpGroup({ doc, onOptionActivated }: UserTreeJumpGroupProps) {
  const entries = useUserTreeJumps();
  const enabledEntries = entries.filter((entry) => entry.enabled);
  // No group heading at all when nothing is configured (or everything's hidden) - "under Tree
  // Jumps" shouldn't show an empty "User Tree Jumps" title with nothing beneath it.
  if (enabledEntries.length === 0) {
    return null;
  }
  return (
    <JumpFlyoutGroup
      doc={doc}
      group={{ title: TEXT.GROUP_NAME.USER_TREE_JUMPS, groupMembers: enabledEntries.map(toFlyoutOption) }}
      onOptionActivated={onOptionActivated}
    />
  );
}
