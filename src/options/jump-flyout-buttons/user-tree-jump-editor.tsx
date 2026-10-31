// @source-path [fobles] src/options/jump-flyout-buttons/user-tree-jump-editor.tsx

import { createUserTreeJumpId, normalizeUserTreeJumpIconPath, type UserTreeJump } from "../../shared/jump-flyout/user-tree-jump-settings";
import { sanitizeJumpFlyoutPathSuffix } from "../../shared/jump-flyout/button-settings";
import { USER_TREE_JUMP } from "../../constants/user-tree-jump-constants";

export type UserTreeJumpEditorProps = { entries: readonly UserTreeJump[]; onChange: (entries: UserTreeJump[]) => void };

export function createEmptyUserTreeJump(): UserTreeJump {
  return { id: createUserTreeJumpId(), label: "", enabled: true, icon: "", pathSuffix: "" };
}

// Re-sanitizes everything right before save, in case a row was never blurred (e.g. pasted then saved immediately).
export function normalizeUserTreeJumpEntriesForSave(entries: readonly UserTreeJump[]): UserTreeJump[] {
  return entries
    .filter((entry) => entry.label.trim())
    .map((entry) => ({ ...entry, pathSuffix: sanitizeJumpFlyoutPathSuffix(entry.pathSuffix), icon: normalizeUserTreeJumpIconPath(entry.icon) }))
    .slice(0, USER_TREE_JUMP.MAX_ENTRIES);
}

export function UserTreeJumpEditor({ entries, onChange }: UserTreeJumpEditorProps) {
  const atLimit = entries.length >= USER_TREE_JUMP.MAX_ENTRIES;

  function updateEntry(id: string, patch: Partial<UserTreeJump>): void {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="user-tree-jump-section">
      <div className="user-tree-jump-heading">User Tree Jumps</div>
      <div className="user-tree-jump-rows">
        {entries.map((entry) => (
          <div key={entry.id} className="jump-flyout-entry user-tree-jump-row" data-user-tree-jump-id={entry.id}>
            <div className="jump-flyout-entry-title">
              <input type="text" name="label" placeholder="Label" value={entry.label} onChange={(event) => updateEntry(entry.id, { label: event.target.value })} />
              <button type="button" className="user-tree-jump-remove" title="Remove this Tree Jump" onClick={() => onChange(entries.filter((other) => other.id !== entry.id))}>×</button>
            </div>
            <div className="jump-flyout-entry-fields">
              <input type="checkbox" name="enabled" checked={entry.enabled} onChange={(event) => updateEntry(entry.id, { enabled: event.target.checked })} />
              <span className="jump-flyout-entry-prefix">/sitecore/</span>
              <input type="text" name="pathSuffix" placeholder="e.g. content/Home" value={entry.pathSuffix} onChange={(event) => updateEntry(entry.id, { pathSuffix: event.target.value })} onBlur={(event) => updateEntry(entry.id, { pathSuffix: sanitizeJumpFlyoutPathSuffix(event.target.value) })} />
              <input type="text" name="icon" placeholder={USER_TREE_JUMP.DEFAULT_ICON_PATH} title="A Sitecore icon path - normalized to the required format on save." value={entry.icon} onChange={(event) => updateEntry(entry.id, { icon: event.target.value })} onBlur={(event) => updateEntry(entry.id, { icon: normalizeUserTreeJumpIconPath(event.target.value) })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="user-tree-jump-add" disabled={atLimit} onClick={() => onChange([...entries, createEmptyUserTreeJump()])}>+ Add User Tree Jump</button>
      <p className="user-tree-jump-limit-status">{atLimit ? `Maximum of ${USER_TREE_JUMP.MAX_ENTRIES} User Tree Jumps reached.` : ""}</p>
    </div>
  );
}
