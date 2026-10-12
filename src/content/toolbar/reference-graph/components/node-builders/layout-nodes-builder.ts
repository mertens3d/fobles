import type cytoscape from "cytoscape";
import { REFERENCE_GRAPH } from "../../../../../constants/graph.const";
import type { LayoutSectionField, SitecoreHarvestResult } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { stripDynamicPlaceholderSuffix, slugify, kindClass } from "../../graph-helpers";
import { buildTooltip } from "../../graph-tooltip";
import type { PlaceholderGroup } from "../../graph.types";
import { buildLabel } from "../../reference-graph-modal";
import { CONST } from "../../../../../constants/const";
import { appendCompoundGraphNode, createLayoutTree } from "./new-functions";

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

function buildLayoutGroupNodes(layout: LayoutSectionField, cytoNodes: cytoscape.ElementDefinition[]) {
    const layoutId = REFERENCE_GRAPH.NODE_ID.BASE_LAYOUT_NODE_ID + layout.name?.replace(/\s+/g, "-").toLowerCase();
    cytoNodes.push(
        {
            data: {
                id: layoutId,
                parent: REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
                label: layout.name ?? "",
                link: undefined,
                tooltip: buildTooltip(`${layout.name ?? ""} (Renderings field)`, undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
        }

    );
    buildDeviceNodes(layout, cytoNodes);
}

function buildDeviceNodes(layout: LayoutSectionField, cytoNodes: cytoscape.ElementDefinition[]) {
    for (const device of layout.devices ?? []) {
        cytoNodes.push({
            data: {
                id: REFERENCE_GRAPH.NODE_ID.BASE_LAYOUT_NODE_ID + layout.name?.replace(/\s+/g, "-").toLowerCase() + "-device-" + device.layoutView?.name?.replace(/\s+/g, "-").toLowerCase(),
                parent: REFERENCE_GRAPH.NODE_ID.BASE_LAYOUT_NODE_ID + layout.name?.replace(/\s+/g, "-").toLowerCase(),
                label: buildLabel(REFERENCE_GRAPH.NODE_KIND.DEVICE, device.layoutView?.name ?? ""),
                link: undefined,
                tooltip: buildTooltip(device.layoutView?.name ?? "Unknown device", undefined, undefined),
            },
            classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.DEVICE)} ${REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
        });
    }
}

function BuildMainLayoutNode(cytoNodes: cytoscape.ElementDefinition[]) {
    cytoNodes.push(
        {
            data: {
                id: REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
                label: "Layout",
                link: undefined,
                tooltip: buildTooltip("Layout (device/renderings/datasources)", undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
        }
    );
}
