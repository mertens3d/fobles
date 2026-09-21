import { TEXT } from "../../constants";
import { createMenuGroup } from "./group-builder";
import {
  buildUserTreeJumpPath,
  getUserTreeJumps,
  onUserTreeJumpsChanged,
  type UserTreeJump,
} from "../../../shared/quick-menu/user-tree-jump-settings";
import type { MenuOption } from "../../../shared/quick-menu/menu.types";

function toMenuOption(entry: UserTreeJump): MenuOption {
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
      createMenuGroup(
        doc,
        { title: TEXT.GROUP_NAME.USER_TREE_JUMPS, groupMembers: enabledEntries.map(toMenuOption) },
        closeMenu,
      ),
    );
  };

  void getUserTreeJumps().then(render);
  onUserTreeJumpsChanged(render);
}
