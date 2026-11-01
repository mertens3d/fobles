// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.tsx

import { createRoot } from "react-dom/client";
import { clearFoblesWindowHost, replaceFoblesWindowHost } from "../../dialog/fobles-window-host-registry";
import { DEVELOPER_DIALOG } from "./developer-dialog.const";
import { DeveloperDialogApp } from "./developer-dialog-app";
import { INDEXEDDB_VIEWER } from "./indexeddb-viewer.const";

// Opens the developer dialog (tabs: Fobles IndexedDB, Runtime Settings). Name and location are unchanged so the toolbar's developer button needs no edit.
export function openIndexedDbViewer(doc: Document): void {
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const root = createRoot(host);
  replaceFoblesWindowHost(doc, INDEXEDDB_VIEWER.DIALOG_ID, host, root);

  function handleClose(): void {
    clearFoblesWindowHost(doc, INDEXEDDB_VIEWER.DIALOG_ID);
    root.unmount();
    host.remove();
  }

  root.render(
    <FoblesWindow
      id={INDEXEDDB_VIEWER.DIALOG_ID}
      className={INDEXEDDB_VIEWER.CLASS.DIALOG}
      title={DEVELOPER_DIALOG.TEXT.TITLE}
      storageKey="fobles.window.developer"
      defaultWidth={Math.min(1100, (doc.defaultView?.innerWidth ?? 1200) - 60)}
      defaultHeight={Math.min(720, (doc.defaultView?.innerHeight ?? 800) - 60)}
      minWidth={640}
      minHeight={420}
      onClose={handleClose}
    >
      <DeveloperDialogApp doc={doc} />
    </FoblesWindow>,
  );
}
