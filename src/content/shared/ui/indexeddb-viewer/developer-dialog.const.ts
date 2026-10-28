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
  STYLE_ELEMENT_ID: "fobles-developer-dialog-style",
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
export const DEVELOPER_DIALOG_STYLE = `
.${DEVELOPER_DIALOG.CLASS.SHELL}{display:flex;width:100%;height:100%;min-height:0;flex-direction:column;gap:8px}
.${DEVELOPER_DIALOG.CLASS.HEADER}{padding-right:56px}
.${DEVELOPER_DIALOG.CLASS.HEADER} h2{margin:0;font-size:16px}
.${DEVELOPER_DIALOG.CLASS.TABLIST}{display:flex;gap:4px;border-bottom:1px solid #7f9bc4}
.${DEVELOPER_DIALOG.CLASS.TAB}{margin-bottom:-1px;padding:6px 14px;border:1px solid transparent;border-radius:4px 4px 0 0;background:transparent;color:#203047;cursor:pointer;font:13px Arial,sans-serif}
.${DEVELOPER_DIALOG.CLASS.TAB}:hover{background:#eef4ff}
.${DEVELOPER_DIALOG.CLASS.TAB}.${DEVELOPER_DIALOG.CLASS.SELECTED}{border-color:#7f9bc4;border-bottom-color:#fff;background:#fff;font-weight:bold}
.${DEVELOPER_DIALOG.CLASS.PANEL}{display:flex;flex:1;min-height:0;flex-direction:column}
.${DEVELOPER_DIALOG.CLASS.PANEL}[hidden]{display:none}
.${DEVELOPER_DIALOG.CLASS.PANEL}>.${INDEXEDDB_VIEWER.CLASS.APP}{flex:1;height:auto}
.${DEVELOPER_DIALOG.CLASS.EDITOR}{display:flex;flex:1;min-height:0;flex-direction:column;gap:8px}
.${DEVELOPER_DIALOG.CLASS.EDITOR_TEXT}{flex:1;min-height:0;width:100%;box-sizing:border-box;padding:8px;resize:none;overflow:auto;border:1px solid #7f9bc4;border-radius:4px;white-space:pre;tab-size:2;font:12px/1.5 Consolas,monospace;color:#203047;background:#fff}
.${DEVELOPER_DIALOG.CLASS.EDITOR_TOOLBAR}{display:flex;align-items:center;gap:8px}
.${DEVELOPER_DIALOG.CLASS.EDITOR_TOOLBAR} button{padding:5px 14px;border:1px solid #7f9bc4;border-radius:4px;background:#fff;cursor:pointer}
.${DEVELOPER_DIALOG.CLASS.EDITOR_TOOLBAR} button:disabled{cursor:default;opacity:.6}
.${DEVELOPER_DIALOG.CLASS.EDITOR_STATUS}{color:#556}
.${DEVELOPER_DIALOG.CLASS.EDITOR_STATUS}.${DEVELOPER_DIALOG.CLASS.ERROR}{color:#9b1c1c}
`;
