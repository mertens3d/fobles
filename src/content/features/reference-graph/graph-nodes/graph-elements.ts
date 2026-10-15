// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-elements.ts

import type cytoscape from "cytoscape";
import { extensionLog } from "../../../logger";
import type {
  HarvestProgressCallback,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { createDataTree } from "../data-tree/data-tree-builder";
import { enrichDataTree } from "../data-tree/data-tree-enricher";
import { appendGraphNode } from "./graph-node-builder";

type BuildElementsOptions = {
  signal?: AbortSignal;
  onProgress?: HarvestProgressCallback;
};

export async function buildGraphElements(
  graphReferenceResult: SitecoreHarvestResult,
  { signal, onProgress }: BuildElementsOptions = {},
): Promise<cytoscape.ElementDefinition[]> {
  const dataTree = createDataTree(graphReferenceResult);

  await enrichDataTree(dataTree, {
    signal,
    onProgress,
  });

  const cytoNodes: cytoscape.ElementDefinition[] = [];

  const cytoEdges: cytoscape.ElementDefinition[] = [];

  if (!signal?.aborted) {
    appendGraphNode(dataTree, cytoNodes, cytoEdges);

    extensionLog.debug("Reference graph: data tree projected", {
      nodeCount: cytoNodes.length,
      edgeCount: cytoEdges.length,
    });
  }

  return [...cytoNodes, ...cytoEdges];
}
