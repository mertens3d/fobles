// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/developer-dialog.const.ts

import { INDEXEDDB_VIEWER } from "./indexeddb-viewer.const";

export const DEVELOPER_DIALOG = {
  CLASS: {
    EDITOR: "fobles-dev-editor",
    EDITOR_STATUS: "fobles-dev-editor-status",
    EDITOR_TEXT: "fobles-dev-editor-text",
    EDITOR_TOOLBAR: "fobles-dev-editor-toolbar",
    ERROR: "is-error",
    HEADER: "fobles-dev-header",
    PANEL: "fobles-dev-panel",
    SELECTED: "is-selected",
    SHELL: "fobles-dev-shell",
    TAB: "fobles-dev-tab",
    TABLIST: "fobles-dev-tablist",
  },
  ID_PREFIX: "fobles-dev",
  TAB_ID: { INDEXEDDB: "indexeddb", RUNTIME_SETTINGS: "runtime-settings" },
  TAB_LABEL: { INDEXEDDB: INDEXEDDB_VIEWER.TEXT.TITLE, RUNTIME_SETTINGS: "Runtime Settings" },
  TEXT: {
    EDITOR_LABEL: "fobles-runtime-settings (JSON)",
    LOADING: "Loading...",
    SAVE: "Save",
    SAVING: "Saving...",
    TABLIST_LABEL: "Developer tools",
    TITLE: "Fobles Developer",
    UNSAVED: "Unsaved changes",
  },
} as const;
