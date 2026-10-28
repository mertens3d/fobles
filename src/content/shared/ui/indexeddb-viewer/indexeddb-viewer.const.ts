// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.const.ts
export const INDEXEDDB_VIEWER = {
  DIALOG_ID: "fobles-indexeddb-viewer-dialog",
  MAX_ROWS: 200,
  STYLE_ELEMENT_ID: "fobles-indexeddb-viewer-style",
  CLASS: { DIALOG: "fobles-idb-dialog", APP: "fobles-idb-app", HEADER: "fobles-idb-header", TABS: "fobles-idb-tabs", ACTIVE_TAB: "is-active", TOOLBAR: "fobles-idb-toolbar", STATUS: "fobles-idb-status", WORKSPACE: "fobles-idb-workspace", TABLE_WRAP: "fobles-idb-table-wrap", TABLE: "fobles-idb-table", VALUE_CELL: "fobles-idb-value-cell", SELECTED_ROW: "is-selected", DANGER: "fobles-idb-danger", DETAILS: "fobles-idb-details" },
  TEXT: { TITLE: "Fobles IndexedDB", SITECORE_ITEMS: "Sitecore Items", SITECORE_FACTS: "Sitecore Facts", STORE_TABS_LABEL: "IndexedDB object stores", REFRESH: "Refresh", CLEAR: "Clear database", SEARCH_PLACEHOLDER: "Search keys and values...", SEARCH_LABEL: "Search cached records", NO_ROWS: "No matching records.", LOADING: "Loading...", LOAD_FAILED: "Could not read the cache", CONFIRM_CLEAR: "Delete every cached Sitecore item and fact? This cannot be undone.", KEY_HEADER: "Key", VALUE_HEADER: "Value", VALUE_CELL_TITLE: "Click to view the entire value", DETAILS_TITLE: "Record Details", DETAILS_CLOSE: "Close record details", DETAILS_KEY: "Key: ", EXPAND_ALL: "Expand all", COLLAPSE_ALL: "Collapse all" },
} as const;
export const INDEXEDDB_VIEWER_STYLE = `
.${INDEXEDDB_VIEWER.CLASS.DIALOG}{width:min(1100px,94vw);height:min(720px,90vh);padding:16px;overflow:hidden;border:1px solid #7f9bc4;border-radius:8px;background:#fff;color:#203047;font:13px/1.4 Arial,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.35)}
.${INDEXEDDB_VIEWER.CLASS.DIALOG}::backdrop{background:rgba(0,0,0,.45)}
.${INDEXEDDB_VIEWER.CLASS.APP}{display:flex;width:100%;height:100%;min-height:0;flex-direction:column;gap:8px}
.${INDEXEDDB_VIEWER.CLASS.HEADER}{padding-right:56px}
.${INDEXEDDB_VIEWER.CLASS.HEADER} h2{margin:0;font-size:16px}
.${INDEXEDDB_VIEWER.CLASS.TABS}{display:flex;gap:4px;border-bottom:1px solid #7f9bc4}
.${INDEXEDDB_VIEWER.CLASS.TABS} button{padding:6px 12px;border:1px solid transparent;border-bottom:0;border-radius:4px 4px 0 0;background:transparent;color:#203047;cursor:pointer}
.${INDEXEDDB_VIEWER.CLASS.TABS} button.${INDEXEDDB_VIEWER.CLASS.ACTIVE_TAB}{border-color:#7f9bc4;background:#eef4ff;font-weight:700}
.${INDEXEDDB_VIEWER.CLASS.TOOLBAR}{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.${INDEXEDDB_VIEWER.CLASS.TOOLBAR} input[type=search]{flex:1;min-width:200px;padding:5px 8px;border:1px solid #7f9bc4;border-radius:4px}
.${INDEXEDDB_VIEWER.CLASS.TOOLBAR} button{padding:5px 10px;border:1px solid #7f9bc4;border-radius:4px;background:#fff;cursor:pointer}
.${INDEXEDDB_VIEWER.CLASS.DANGER}{border-color:#9b1c1c!important;color:#9b1c1c}
.${INDEXEDDB_VIEWER.CLASS.STATUS}{color:#556}
.${INDEXEDDB_VIEWER.CLASS.WORKSPACE}{position:relative;flex:1;min-height:0;overflow:hidden}
.${INDEXEDDB_VIEWER.CLASS.TABLE_WRAP}{height:100%;overflow:auto;border:1px solid #d7dce4;border-radius:5px}
.${INDEXEDDB_VIEWER.CLASS.TABLE}{width:100%;border-collapse:collapse;table-layout:fixed}
.${INDEXEDDB_VIEWER.CLASS.TABLE} th{position:sticky;top:0;background:#f6f8fb;text-align:left}
.${INDEXEDDB_VIEWER.CLASS.TABLE} th,.${INDEXEDDB_VIEWER.CLASS.TABLE} td{padding:5px 8px;border-bottom:1px solid #e0e5ed;vertical-align:top;overflow-wrap:anywhere;font:12px Consolas,monospace}
.${INDEXEDDB_VIEWER.CLASS.TABLE} th:first-child,.${INDEXEDDB_VIEWER.CLASS.TABLE} td:first-child{width:32%}
.${INDEXEDDB_VIEWER.CLASS.VALUE_CELL}{cursor:pointer}
.${INDEXEDDB_VIEWER.CLASS.VALUE_CELL}:hover{background:#eef4ff}
.${INDEXEDDB_VIEWER.CLASS.SELECTED_ROW} td{background:#e3edff}
.${INDEXEDDB_VIEWER.CLASS.DETAILS}{position:absolute;top:0;right:0;bottom:0;z-index:20;width:min(620px,75%);overflow:hidden;background:#20344f;box-shadow:-10px 0 24px rgba(0,0,0,.22)}
.${INDEXEDDB_VIEWER.CLASS.DETAILS} .fobles-reference-graph-node-details{position:relative;inset:auto;width:auto;max-width:none;height:100%;min-height:0;max-height:none;margin:0;overflow:auto;border-radius:0;box-sizing:border-box}
`;
