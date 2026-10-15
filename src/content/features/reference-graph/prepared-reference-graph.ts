// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.ts

import { extensionLog } from "../../logger";
import type {
  HarvestProgressCallback,
  SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import { createDataTree } from "./data-tree/data-tree-builder";
import { enrichDataTree } from "./data-tree/data-tree-enricher";
import { buildDataTreeNodeLookup } from "./data-tree/data-tree-node-lookup";
import { projectDataTreeToGraphElements } from "./graph-nodes/graph-elements";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";

type PrepareReferenceGraphOptions = {
  signal?: AbortSignal;
  onProgress?: HarvestProgressCallback;
};

// Single orchestration point for createDataTree -> enrichDataTree -> node lookup -> graph
// projection. Both the initial harvest and every lazy-filter/reroot/back re-render call this
// same function instead of duplicating the pipeline.
export async function prepareReferenceGraph(
  harvestedData: SitecoreHarvestResult,
  { signal, onProgress }: PrepareReferenceGraphOptions = {},
): Promise<PreparedReferenceGraph | undefined> {
  const dataTree = createDataTree(harvestedData);

  const enrichedDataTree = await enrichDataTree(dataTree, {
    signal,
    onProgress,
  });

  let prepared: PreparedReferenceGraph | undefined;

  if (!signal?.aborted) {
    const nodesById = buildDataTreeNodeLookup(enrichedDataTree);

    const graphElements = projectDataTreeToGraphElements(enrichedDataTree);

    extensionLog.debug("Reference graph: prepared", {
      nodeCount: nodesById.size,
    });

    prepared = {
      harvestedData,
      dataTree: enrichedDataTree,
      nodesById,
      graphElements,
    };
  }

  return prepared;
}
