import type { PrepareReferenceModelOptions } from "./acquisition.types.js";
import type { PreparedReferenceModel } from "./acquisition.types.js";
// @source-path [fobles] src/content/foundation/reference-data/acquisition/prepare-reference-model.ts
import { extensionLog } from "../../../logger";
import type { SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import { createReferenceModel } from "../model/reference-model-builder";
import { buildReferenceModelNodeLookup } from "../model/reference-model-node-lookup";
import type { ReferenceModelNode } from "../model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../processing/processing.types";
import type { ProcessingStatus } from "../processing/processing.types";

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
