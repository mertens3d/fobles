// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.ts
import { extensionLog } from "../../logger";
import type {
  HarvestProgressCallback,
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../foundation/harvesting/sitecore-harvester.types";
import { prepareReferenceModel, type PreparedReferenceModel } from "../../foundation/reference-data/acquisition/prepare-reference-model";
import type { ProcessingStatus } from "../../foundation/reference-data/processing/processing-state";
import { projectReferenceModelToGraphElements } from "./graph-nodes/graph-elements";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

type PrepareReferenceGraphOptions = {
  signal?: AbortSignal;
  // Not used while preparation is structural-only (enrichment runs separately, after the graph is built) - kept so
  // existing callers don't need to change.
  onProgress?: HarvestProgressCallback;
  // Seeds the root node's own trust badge from the root-cache-flow decision that produced this harvest result.
  rootProcessingState?: ProcessingStatus;
};

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
