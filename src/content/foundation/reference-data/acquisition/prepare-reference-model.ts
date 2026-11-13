// @source-path [fobles] src/content/foundation/reference-data/acquisition/prepare-reference-model.ts

import type { PreparedReferenceModel, PrepareReferenceModelOptions } from "./acquisition.types.js";
import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import { extensionLog } from "../../../logger";
import type { SitecoreHarvestResult } from "../../harvesting/harvesting.types.js";
import { createReferenceModel } from "../model/reference-model-builder";
import { buildReferenceModelNodeLookup } from "../model/reference-model-node-lookup";
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
