// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.ts
import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";
import type { SitecoreHarvestResult } from "../../foundation/harvesting/harvesting.types";
import type { PreparedReferenceModel } from "../../foundation/reference-data/acquisition/acquisition.types";
import { prepareReferenceModel } from "../../foundation/reference-data/acquisition/prepare-reference-model";
import { extensionLog } from "../../logger";
import { projectReferenceModelToGraphElements } from "./graph-nodes/graph-elements";
import type { PreparedReferenceGraph, PrepareReferenceGraphOptions } from "./reference-graph.types";

// Graph's only addition to a prepared Reference Model: the Cytoscape elements projected from it.
export function addGraphElements(model: PreparedReferenceModel): PreparedReferenceGraph {
  const graphElements = projectReferenceModelToGraphElements(model.referenceModel, model.processingStateByTreeNodeId);

  extensionLog.debug("Reference graph: elements projected", { nodeCount: model.nodesById.size });

  return { ...model, graphElements };
}

// Used by every re-render that has a fresh harvest in hand (reroot, lazy filter enable, back): the headless
// Reference Model comes from Foundation, then Graph projects it.
export function prepareReferenceGraph(
  harvestedData: SitecoreHarvestResult,
  filters: SitecoreHarvestFiltersState,
  { signal, rootProcessingState }: PrepareReferenceGraphOptions = {},
): Promise<PreparedReferenceGraph | undefined> {
  const model = prepareReferenceModel(harvestedData, filters, { signal, rootProcessingState });

  return Promise.resolve(model ? addGraphElements(model) : undefined);
}
