import type cytoscape from "cytoscape";
import { createDataTree } from "../data-tree/data-tree-builder";
import { appendGraphNode } from "./graph-node-builder";
import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { extensionLog } from "../../../logger";

export function buildElements(
  graphReferenceResult: SitecoreHarvestResult,
): cytoscape.ElementDefinition[] {
  const dataTree = createDataTree(graphReferenceResult);
  extensionLog.debug("[Fobles] dataTree: ", dataTree);

  const cytoNodes: cytoscape.ElementDefinition[] = [];
  const cytoEdges: cytoscape.ElementDefinition[] = [];

  appendGraphNode(dataTree, cytoNodes, cytoEdges);

  return [...cytoNodes, ...cytoEdges];
}
