import type cytoscape from "cytoscape";
import type {  SitecoreHarvestResult } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../../constants/const";
import { appendCompoundGraphNode, createLayoutTree } from "./layout-tree-builder";

export function buildLayoutNodes(
    graphReferenceResult: SitecoreHarvestResult,
    cytoNodes: cytoscape.ElementDefinition[],
    cytoEdges: cytoscape.ElementDefinition[],
): void {
    const hasLayoutData =
        (graphReferenceResult.layoutSectionFields?.length ?? 0) > 0;

    if (hasLayoutData) {
        const layoutTree = createLayoutTree(graphReferenceResult);

        appendCompoundGraphNode(layoutTree, cytoNodes);

        cytoEdges.push({
            data: {
                id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.EDGE_LAYOUT,
                source: graphReferenceResult.rootItem.itemId,
                target: layoutTree.id,
            },
        });
    }
}
