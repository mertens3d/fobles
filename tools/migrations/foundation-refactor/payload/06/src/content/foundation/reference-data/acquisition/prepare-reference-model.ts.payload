// @source-path [fobles] src/content/foundation/reference-data/acquisition/prepare-reference-model.ts
import { extensionLog } from "../../../logger";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import { createReferenceModel } from "../model/reference-model-builder";
import { buildReferenceModelNodeLookup } from "../model/reference-model-node-lookup";
import type { ReferenceModelNode } from "../model/reference-model.types";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "../processing/processing-state";

// The headless result of preparing a harvest: the Reference Model, its node lookup, and the processing-state map that
// Resolve and Harvest later update. Everything a consumer needs, with no UI projection - Graph adds Cytoscape elements.
export type PreparedReferenceModel = {
  harvestedData: SitecoreHarvestResult;
  referenceModel: ReferenceModelNode;
  nodesById: Map<string, ReferenceModelNode>;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
};

type PrepareReferenceModelOptions = {
  signal?: AbortSignal;
  // Seeds the root node's own trust badge from the root-cache-flow decision that produced this harvest result. Defaults
  // to "enriched" for callers whose result is always a just-completed harvest (reroot, lazy filter enable).
  rootProcessingState?: ProcessingStatus;
};

// Single orchestration point for createReferenceModel -> node lookup. Every consumer of a harvest result goes through here.
export function prepareReferenceModel(
  harvestedData: SitecoreHarvestResult,
  filters: SitecoreHarvestFiltersState,
  { signal, rootProcessingState = "enriched" }: PrepareReferenceModelOptions = {},
): PreparedReferenceModel | undefined {
  const referenceModel = createReferenceModel(harvestedData, filters);
  const processingStateByTreeNodeId = new Map<string, ProcessingStatus>();
  let prepared: PreparedReferenceModel | undefined;

  processingStateByTreeNodeId.set(referenceModel.treeNodeId, rootProcessingState);

  if (!signal?.aborted) {
    const nodesById = buildReferenceModelNodeLookup(referenceModel);

    extensionLog.debug("Reference model: prepared", { nodeCount: nodesById.size });
    prepared = { harvestedData, referenceModel, nodesById, processingStateByTreeNodeId };
  }

  return prepared;
}
