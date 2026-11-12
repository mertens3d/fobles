import type { StartEnrichmentControllerOptions } from "./enrichment.types.js";
// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-controller.ts
import { getFoblesDataSession } from "../../../foundation/reference-data/reference-data-service";
import { patchCytoscapeNodes } from "./enrichment-graph-patcher";
import type { EnrichmentController } from "./enrichment.types";

let activeController: EnrichmentController | undefined;

export function disposeActiveEnrichmentController(): void {
  activeController?.dispose();
  activeController = undefined;
}

export function startEnrichmentController({
  workSession,
  nodesById,
  getCy,
  processingStateByTreeNodeId,
  onProgress,
}: StartEnrichmentControllerOptions): EnrichmentController {
  disposeActiveEnrichmentController();
  const session = getFoblesDataSession(workSession.id);
  if (!session) {
    throw new Error("Shared Reference Model session is not active");
  }
  const unsubscribeState = session.subscribeChange((treeNodeIds) =>
    patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId),
  );
  const unsubscribeProgress = onProgress ? session.subscribeProcessingProgress(onProgress) : () => undefined;
  const controller: EnrichmentController = {
    dispose: () => {
      unsubscribeState();
      unsubscribeProgress();
    },
  };
  activeController = controller;
  return controller;
}
