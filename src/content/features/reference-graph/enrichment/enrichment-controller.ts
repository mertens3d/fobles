// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-controller.ts
import type cytoscape from "cytoscape";
import type { WorkSession } from "../../../shell/work-session/work-session.types";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { startReferenceModelProcessor } from "../../../shared/reference-model-processing/reference-model-processor";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";
import { enqueueHarvest } from "../lifecycle/active-harvest-queue";
import { patchCytoscapeNodes } from "./enrichment-graph-patcher";
import type { EnrichmentController, EnrichmentProgressCallback } from "./enrichment.types";
type StartEnrichmentControllerOptions = { doc: Document; workSession: WorkSession; referenceModel: ReferenceModelNode; nodesById: Map<string, ReferenceModelNode>; getCy: () => cytoscape.Core | undefined; processingStateByTreeNodeId: ProcessingStateByTreeNodeId; onProgress?: EnrichmentProgressCallback; };
let activeController: EnrichmentController | undefined;
export function disposeActiveEnrichmentController(): void { activeController?.dispose(); activeController = undefined; }
export function startEnrichmentController({ doc, workSession, referenceModel, nodesById, getCy, processingStateByTreeNodeId, onProgress }: StartEnrichmentControllerOptions): EnrichmentController {
  disposeActiveEnrichmentController();
  const controller = startReferenceModelProcessor({ doc, workSession, referenceModel, nodesById, processingStateByTreeNodeId, onStateChange: (treeNodeIds) => patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId), onStaleStructural: (reference, _treeNodeIds, setTerminalState) => enqueueHarvest(reference, setTerminalState), onProgress });
  activeController = controller;
  return controller;
}
