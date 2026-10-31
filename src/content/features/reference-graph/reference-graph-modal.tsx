// @source-path [fobles] src/content/features/reference-graph/reference-graph-modal.tsx

import { createRoot } from "react-dom/client";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { showFoblesCleanupDialog } from "../../../shared/error-dialog";
import { createFoblesWindow } from "../../shared/dialog/fobles-window";
import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import { closeReferenceGraphProgressModal } from "./build-progress";
import { disposeActiveEnrichmentController } from "./enrichment/enrichment-controller";
import type { HarvestForLink } from "./graph.types";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";
import { ReferenceGraphApp } from "./reference-graph-app";
import { requireReferenceGraphSessionContainer } from "./reference-graph-session-container";

export function openReferenceGraphModal(doc: Document, workSession: WorkSession, preparedGraph: PreparedReferenceGraph, harvestForLink: HarvestForLink): Promise<void> {
  doc.getElementById(REFERENCE_GRAPH.DOM.IDS.DIALOG_ID)?.remove();
  return new Promise<void>((resolve) => {
    const { window: dialog, content, dispose } = createFoblesWindow(doc, {
      id: REFERENCE_GRAPH.DOM.IDS.DIALOG_ID,
      className: "fobles-reference-graph",
      title: "Fobles Reference Graph",
      storageKey: "fobles.window.reference-graph",
      defaultWidth: Math.round((doc.defaultView?.innerWidth ?? 1200) * 0.9),
      defaultHeight: Math.round((doc.defaultView?.innerHeight ?? 800) * 0.85),
      minWidth: 620,
      minHeight: 420,
      owner: requireReferenceGraphSessionContainer(doc),
    });
    const appHost = doc.createElement("div");
    appHost.style.cssText = "position:relative;width:100%;height:100%;";
    const appRoot = createRoot(appHost);
    content.appendChild(appHost);
    dialog.addEventListener("fobles-window-close", () => {
      void (async () => {
        const cleanupDialog = showFoblesCleanupDialog(doc);
        disposeActiveEnrichmentController();
        closeReferenceGraphProgressModal(doc);
        try {
          await workSession.cancel();
        } finally {
          if (cleanupDialog.isConnected) cleanupDialog.close();
          dispose();
          appRoot.unmount();
          dialog.remove();
          resolve();
        }
      })();
    }, { once: true });
    appRoot.render(<ReferenceGraphApp doc={doc} workSession={workSession} initialPreparedGraph={preparedGraph} harvestForLink={harvestForLink} />);
  });
}
