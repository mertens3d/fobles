import { TEXT } from "../../../constants/fobles.constants";
import { createFlyoutGroup } from "./group-builder";
import {
  buildUserTreeJumpPath,
  getUserTreeJumps,
  onUserTreeJumpsChanged,
  type UserTreeJump,
} from "../../../shared/jump-flyout/user-tree-jump-settings";
import type { FlyoutOption } from "../../../shared/jump-flyout/jump-flyout.types";

function toFlyoutOption(entry: UserTreeJump): FlyoutOption {
  return {
    id: entry.id,
    label: entry.label,
    path: buildUserTreeJumpPath(entry.pathSuffix),
    icon: entry.icon,
  };
}

// Appends a live-updating "User Tree Jumps" group to the Tree Jumps column. Rebuilt from scratch
// on every settings change (rather than toggling fixed rows like button-visibility.ts does) since
// this list can grow or shrink, unlike the fixed catalog's known-in-advance button set.
export function initUserTreeJumpGroup(
  doc: Document,
  column: HTMLDivElement,
  closeMenu: () => void,
): void {
  const wrapper = doc.createElement("div");
  column.appendChild(wrapper);

  const render = (entries: UserTreeJump[]): void => {
    wrapper.textContent = "";
    const enabledEntries = entries.filter((entry) => entry.enabled);
    // No group heading at all when nothing is configured (or everything's hidden) - "under Tree
    // Jumps" shouldn't show an empty "User Tree Jumps" title with nothing beneath it.
    if (enabledEntries.length === 0) return;

    wrapper.appendChild(
      createFlyoutGroup(
        doc,
        { title: TEXT.GROUP_NAME.USER_TREE_JUMPS, groupMembers: enabledEntries.map(toFlyoutOption) },
        closeMenu,
      ),
    );
  };

  void getUserTreeJumps().then(render);
  onUserTreeJumpsChanged(render);
}
