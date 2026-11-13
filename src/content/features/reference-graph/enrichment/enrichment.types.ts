// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment.types.ts

import type { ReferenceModelNode } from "../../../foundation/reference-data/model/model.types";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing.types";
import type { WorkSession } from "../../../foundation/workers/session/work-session.types";
import type { projectGraphNode } from "../graph-nodes/graph-node-builder";
import type cytoscape from "cytoscape";

// Counts unique GUIDs requiring enrichment - never Cytoscape nodes or ReferenceModel nodes, since one
// GUID can back several tree nodes/graph nodes at once.
export type EnrichmentProgress = {
  completedItemCount: number;
  maxItemCount: number;
  status: "idle" | "running" | "complete";
};

export type EnrichmentProgressCallback = (progress: EnrichmentProgress) => void;

export type EnrichmentController = { dispose: () => void };

// 0 = Name unknown (highest priority), 1 = Name known but other quick-info metadata (id/template)
// missing, 2 = Name known and only Path missing (lowest priority).
export type EnrichmentPriorityRank = 0 | 1 | 2;

export type StartEnrichmentControllerOptions = {
  doc: Document;
  workSession: WorkSession;
  referenceModel: ReferenceModelNode;
  nodesById: Map<string, ReferenceModelNode>;
  getCy: () => cytoscape.Core | undefined;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onProgress?: EnrichmentProgressCallback;
};

export type ProjectedGraphNodeData = ReturnType<typeof projectGraphNode>["data"];

export type NodeRuntimeState = { position: cytoscape.Position; selected: boolean; locked: boolean; grabbable: boolean };
