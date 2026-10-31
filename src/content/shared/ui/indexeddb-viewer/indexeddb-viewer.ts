// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.ts
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createFoblesWindow } from "../../dialog/fobles-window";
import { JSON_TREE, JSON_TREE_STYLE } from "../json-tree/json-tree.const";
import { DEVELOPER_DIALOG, DEVELOPER_DIALOG_STYLE } from "./developer-dialog.const";
import { DeveloperDialogApp } from "./developer-dialog-app";
import { INDEXEDDB_VIEWER, INDEXEDDB_VIEWER_STYLE } from "./indexeddb-viewer.const";
function ensureStyle(doc: Document, id: string, css: string): void {
  if (!doc.getElementById(id)) {
    const style = doc.createElement("style");
    style.id = id;
    style.textContent = css;
    doc.head.appendChild(style);
  }
}
// Opens the developer dialog (tabs: Fobles IndexedDB, Runtime Settings). Name and location are unchanged so the toolbar's developer button needs no edit.
export function openIndexedDbViewer(doc: Document): void {
  doc.getElementById(INDEXEDDB_VIEWER.DIALOG_ID)?.remove();
  ensureStyle(doc, JSON_TREE.STYLE_ELEMENT_ID, JSON_TREE_STYLE);
  ensureStyle(doc, INDEXEDDB_VIEWER.STYLE_ELEMENT_ID, INDEXEDDB_VIEWER_STYLE);
  ensureStyle(doc, DEVELOPER_DIALOG.STYLE_ELEMENT_ID, DEVELOPER_DIALOG_STYLE);
  const { window: dialog, content, dispose } = createFoblesWindow(doc, { id: INDEXEDDB_VIEWER.DIALOG_ID, className: INDEXEDDB_VIEWER.CLASS.DIALOG, title: DEVELOPER_DIALOG.TEXT.TITLE, storageKey: "fobles.window.developer", defaultWidth: Math.min(1100, (doc.defaultView?.innerWidth ?? 1200) - 60), defaultHeight: Math.min(720, (doc.defaultView?.innerHeight ?? 800) - 60), minWidth: 640, minHeight: 420 });
  const appHost = doc.createElement("div");
  const appRoot = createRoot(appHost);
  appHost.style.cssText = "width:100%;height:100%;";
  content.appendChild(appHost);
  dialog.addEventListener(
    "close",
    () => {
      dispose();
      appRoot.unmount();
      dialog.remove();
    },
    { once: true },
  );
  appRoot.render(createElement(DeveloperDialogApp, { doc }));
}
