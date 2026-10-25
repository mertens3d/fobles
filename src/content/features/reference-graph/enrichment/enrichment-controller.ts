// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-controller.ts
import type cytoscape from "cytoscape";
import type { WorkSession } from "../../../shell/work-session/work-session.types";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { getFoblesDataSession } from "../../../shared/data/fobles-data-service";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";
import { patchCytoscapeNodes } from "./enrichment-graph-patcher";
import type { EnrichmentController, EnrichmentProgressCallback } from "./enrichment.types";
type StartEnrichmentControllerOptions = { doc: Document; workSession: WorkSession; referenceModel: ReferenceModelNode; nodesById: Map<string, ReferenceModelNode>; getCy: () => cytoscape.Core | undefined; processingStateByTreeNodeId: ProcessingStateByTreeNodeId; onProgress?: EnrichmentProgressCallback; };
let activeController: EnrichmentController | undefined;
export function disposeActiveEnrichmentController(): void { activeController?.dispose(); activeController = undefined; }
export function startEnrichmentController({ workSession, nodesById, getCy, processingStateByTreeNodeId, onProgress }: StartEnrichmentControllerOptions): EnrichmentController {
  disposeActiveEnrichmentController();
  const session = getFoblesDataSession(workSession.id);
  if (!session) throw new Error("Shared Reference Model session is not active");
  const unsubscribeState = session.subscribeChange((treeNodeIds) => patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId));
  const unsubscribeProgress = onProgress ? session.subscribeProcessingProgress(onProgress) : () => undefined;
  const controller: EnrichmentController = { dispose: () => { unsubscribeState(); unsubscribeProgress(); } };
  activeController = controller;
  return controller;
}
