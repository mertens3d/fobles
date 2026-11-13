// @source-path [fobles] src/options/jump-flyout-buttons/user-admin-page-editor.tsx

import {
  createUserAdminPageId,
  normalizeUserAdminPageIconPath,
  normalizeUserAdminPageUrl,
  type UserAdminPage,
} from "../../shared/jump-flyout/user-admin-page-settings";
import { USER_ADMIN_PAGE } from "../../shared/jump-flyout/jump-flyout.const";
import type { UserAdminPageEditorProps } from "./UserAdminPageEditorProps";

export function createEmptyUserAdminPage(): UserAdminPage {
  return { id: createUserAdminPageId(), label: "", enabled: true, icon: "", url: "" };
}

// Re-normalizes everything right before save, in case a row was never blurred (e.g. pasted then saved immediately).
export function normalizeUserAdminPageEntriesForSave(entries: readonly UserAdminPage[]): UserAdminPage[] {
  return entries
    .filter((entry) => entry.label.trim())
    .map((entry) => ({
      ...entry,
      url: normalizeUserAdminPageUrl(entry.url),
      icon: normalizeUserAdminPageIconPath(entry.icon),
    }))
    .slice(0, USER_ADMIN_PAGE.MAX_ENTRIES);
}

export function UserAdminPageEditor({ entries, onChange }: UserAdminPageEditorProps) {
  const atLimit = entries.length >= USER_ADMIN_PAGE.MAX_ENTRIES;

  function updateEntry(id: string, patch: Partial<UserAdminPage>): void {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="user-admin-page-section">
      <div className="user-admin-page-heading">User Admin Pages</div>
      <div className="user-admin-page-rows">
        {entries.map((entry) => (
          <div key={entry.id} className="jump-flyout-entry user-admin-page-row" data-user-admin-page-id={entry.id}>
            <div className="jump-flyout-entry-title">
              <input
                type="text"
                name="label"
                placeholder={`e.g. ${USER_ADMIN_PAGE.EXAMPLE_LABEL}`}
                value={entry.label}
                onChange={(event) => updateEntry(entry.id, { label: event.target.value })}
              />
              <button
                type="button"
                className="user-admin-page-remove"
                title="Remove this Admin Page"
                onClick={() => onChange(entries.filter((other) => other.id !== entry.id))}
              >
                ×
              </button>
            </div>
            <div className="jump-flyout-entry-fields">
              <input
                type="checkbox"
                name="enabled"
                checked={entry.enabled}
                onChange={(event) => updateEntry(entry.id, { enabled: event.target.checked })}
              />
              <input
                type="text"
                name="url"
                placeholder={`e.g. ${USER_ADMIN_PAGE.EXAMPLE_URL}`}
                value={entry.url}
                onChange={(event) => updateEntry(entry.id, { url: event.target.value })}
                onBlur={(event) => updateEntry(entry.id, { url: normalizeUserAdminPageUrl(event.target.value) })}
              />
              <input
                type="text"
                name="icon"
                placeholder={USER_ADMIN_PAGE.DEFAULT_ICON_PATH}
                title="A Sitecore icon path - normalized to the required format on save."
                value={entry.icon}
                onChange={(event) => updateEntry(entry.id, { icon: event.target.value })}
                onBlur={(event) => updateEntry(entry.id, { icon: normalizeUserAdminPageIconPath(event.target.value) })}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="user-admin-page-add"
        disabled={atLimit}
        onClick={() => onChange([...entries, createEmptyUserAdminPage()])}
      >
        + Add User Admin Page
      </button>
      <p className="user-admin-page-limit-status">
        {atLimit ? `Maximum of ${USER_ADMIN_PAGE.MAX_ENTRIES} User Admin Pages reached.` : ""}
      </p>
    </div>
  );
}
