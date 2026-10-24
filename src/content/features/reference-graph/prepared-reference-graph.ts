// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.ts

import { extensionLog } from "../../logger";
import type {
  HarvestProgressCallback,
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import { createDataTree } from "./data-tree/data-tree-builder";
import { buildDataTreeNodeLookup } from "./data-tree/data-tree-node-lookup";
import type { EnrichmentStatus } from "./data-tree/data-tree.types";
import { projectDataTreeToGraphElements } from "./graph-nodes/graph-elements";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

type PrepareReferenceGraphOptions = {
  signal?: AbortSignal;
  // Not used while preparation is structural-only (enrichment now runs separately, after the
  // graph is already built/rendered) - kept so existing callers don't need to change yet.
  onProgress?: HarvestProgressCallback;
  // Seeds the root node's own trust badge from the root-cache-flow decision that produced this
  // harvest result - defaults to "enriched" (settled/check) for callers that predate this concept
  // (reroot, lazy-filter-enable), since a result they hand in is always a just-completed harvest.
  rootProcessingState?: EnrichmentStatus;
};

// Single orchestration point for createDataTree -> node lookup -> graph projection. Both the
// initial harvest and every lazy-filter/reroot/back re-render call this same function instead
// of duplicating the pipeline. Enrichment is intentionally NOT run here - the graph must
// build/render from the structural DataTree first; enrichment patches it in afterward.
export function prepareReferenceGraph(
  harvestedData: SitecoreHarvestResult,
  filters: SitecoreHarvestFiltersState,
  { signal, rootProcessingState = "enriched" }: PrepareReferenceGraphOptions = {},
): Promise<PreparedReferenceGraph | undefined> {
  const dataTree = createDataTree(harvestedData, filters, rootProcessingState);

  let prepared: PreparedReferenceGraph | undefined;

  if (!signal?.aborted) {
    const nodesById = buildDataTreeNodeLookup(dataTree);

    const graphElements = projectDataTreeToGraphElements(dataTree);

    extensionLog.debug("Reference graph: prepared", {
      nodeCount: nodesById.size,
    });

    prepared = {
      harvestedData,
      dataTree,
      nodesById,
      graphElements,
    };
  }

  return Promise.resolve(prepared);
}
