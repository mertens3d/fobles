// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.ts
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createDialogCloseButton } from "../../dialog/dialog-close-button";
import { JSON_TREE, JSON_TREE_STYLE } from "../json-tree/json-tree.const";
import { INDEXEDDB_VIEWER, INDEXEDDB_VIEWER_STYLE } from "./indexeddb-viewer.const";
import { IndexedDbViewerApp } from "./indexeddb-viewer-app";

function ensureStyle(doc: Document, id: string, css: string): void {
  if (!doc.getElementById(id)) {
    const style = doc.createElement("style");
    style.id = id;
    style.textContent = css;
    doc.head.appendChild(style);
  }
}

export function openIndexedDbViewer(doc: Document): void {
  doc.getElementById(INDEXEDDB_VIEWER.DIALOG_ID)?.remove();
  ensureStyle(doc, JSON_TREE.STYLE_ELEMENT_ID, JSON_TREE_STYLE);
  ensureStyle(doc, INDEXEDDB_VIEWER.STYLE_ELEMENT_ID, INDEXEDDB_VIEWER_STYLE);
  const dialog = doc.createElement("dialog");
  const appHost = doc.createElement("div");
  const appRoot = createRoot(appHost);
  dialog.id = INDEXEDDB_VIEWER.DIALOG_ID;
  dialog.className = INDEXEDDB_VIEWER.CLASS.DIALOG;
  appHost.style.cssText = "width:100%;height:100%;";
  dialog.append(createDialogCloseButton(doc, dialog), appHost);
  doc.body.appendChild(dialog);
  dialog.addEventListener(
    "close",
    () => {
      appRoot.unmount();
      dialog.remove();
    },
    { once: true },
  );
  dialog.showModal();
  appRoot.render(createElement(IndexedDbViewerApp, { doc }));
}
