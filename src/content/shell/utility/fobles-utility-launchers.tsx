// @source-path [fobles] src/content/shell/utility/fobles-utility-launchers.tsx
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { showFoblesCleanupDialog } from "../../../shared/error-dialog";
import type { AuditFindingStore } from "../../features/auditor/audit-finding-store";
import { createAuditorView } from "../../features/auditor/components/auditor-dialog/auditor-dialog";
import { closeReferenceGraphProgressModal } from "../../features/reference-graph/build-progress";
import { disposeActiveEnrichmentController } from "../../features/reference-graph/enrichment/enrichment-controller";
import type { HarvestForLink } from "../../features/reference-graph/graph.types";
import type { PreparedReferenceGraph } from "../../features/reference-graph/prepared-reference-graph.types";
import { createReferenceGraphView } from "../../features/reference-graph/reference-graph-modal";
import { logHeapSnapshot } from "../../foundation/diagnostics/heap-snapshot";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { DEVELOPER_DIALOG } from "../../shared/ui/indexeddb-viewer/developer-dialog.const";
import { createDeveloperView } from "../../shared/ui/indexeddb-viewer/indexeddb-viewer";
import { INDEXEDDB_VIEWER } from "../../shared/ui/indexeddb-viewer/indexeddb-viewer.const";
import { openFoblesUtility } from "./fobles-utility";

export const AUDITOR_DIALOG_ID = "fobles-auditor-dialog";

export function openAuditorUtility(
  doc: Document,
  findingStore: AuditFindingStore,
  workOperationId: string,
  onCancelRequested: () => Promise<void>,
  lockAlreadyHeld = false,
): Promise<void> {
  return new Promise<void>((resolve) => {
    void openFoblesUtility({
      lockAlreadyHeld,
      doc,
      id: AUDITOR_DIALOG_ID,
      className: "fobles-auditor-dialog",
      title: "Fobles Reference Audit",
      storageKey: "fobles.window.auditor",
      defaultWidth: Math.min(760, (doc.defaultView?.innerWidth ?? 1000) - 40),
      defaultHeight: Math.min(760, (doc.defaultView?.innerHeight ?? 800) - 40),
      minWidth: 560,
      minHeight: 420,
      onHelp: () => window.dispatchEvent(new CustomEvent("fobles:auditor-help")),
      onClose: async () => {
        logHeapSnapshot("auditor-closing", { workOperationId });
        const cleanupDialog = showFoblesCleanupDialog(doc);
        try {
          await onCancelRequested();
        } finally {
          if (cleanupDialog.isConnected) {
            cleanupDialog.close();
          }
          logHeapSnapshot("auditor-closed", { workOperationId });
          window.setTimeout(() => logHeapSnapshot("auditor-closed+10s", { workOperationId }), 10000);
          resolve();
        }
      },
      createChildren: () => createAuditorView({ doc, findingStore, workOperationId }),
    }).then((opened) => {
      if (!opened) {
        resolve();
      }
    });
  });
}

export function openReferenceGraphUtility(
  doc: Document,
  workOperation: WorkOperation,
  preparedGraph: PreparedReferenceGraph,
  harvestForLink: HarvestForLink,
  lockAlreadyHeld = false,
): Promise<void> {
  return new Promise<void>((resolve) => {
    void openFoblesUtility({
      lockAlreadyHeld,
      doc,
      id: REFERENCE_GRAPH.DOM.IDS.DIALOG_ID,
      className: "fobles-reference-graph",
      title: "Fobles Reference Graph",
      storageKey: "fobles.window.reference-graph",
      defaultWidth: Math.round((doc.defaultView?.innerWidth ?? 1200) * 0.9),
      defaultHeight: Math.round((doc.defaultView?.innerHeight ?? 800) * 0.85),
      minWidth: 620,
      minHeight: 420,
      onClose: async () => {
        const cleanupDialog = showFoblesCleanupDialog(doc);
        disposeActiveEnrichmentController();
        closeReferenceGraphProgressModal(doc);
        try {
          await workOperation.cancel();
        } finally {
          if (cleanupDialog.isConnected) {
            cleanupDialog.close();
          }
          resolve();
        }
      },
      createChildren: () => createReferenceGraphView({ doc, workOperation, preparedGraph, harvestForLink }),
    }).then((opened) => {
      if (!opened) {
        resolve();
      }
    });
  });
}

export function openDeveloperUtility(doc: Document): void {
  const existing = doc.getElementById(INDEXEDDB_VIEWER.DIALOG_ID);
  if (existing) {
    existing.querySelector<HTMLButtonElement>(".fobles-dialog-icon-button--close")?.click();
    return;
  }
  void openFoblesUtility({
    doc,
    id: INDEXEDDB_VIEWER.DIALOG_ID,
    className: INDEXEDDB_VIEWER.CLASS.DIALOG,
    title: DEVELOPER_DIALOG.TEXT.TITLE,
    storageKey: "fobles.window.developer",
    defaultWidth: Math.min(1100, (doc.defaultView?.innerWidth ?? 1200) - 60),
    defaultHeight: Math.min(720, (doc.defaultView?.innerHeight ?? 800) - 60),
    minWidth: 640,
    minHeight: 420,
    createChildren: () => createDeveloperView(doc),
  });
}
