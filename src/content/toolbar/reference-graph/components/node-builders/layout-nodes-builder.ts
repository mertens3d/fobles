import type cytoscape from "cytoscape";
import { REFERENCE_GRAPH } from "../../../../../constants/graph.const";
import type { LayoutSectionField, SitecoreHarvestResult } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { stripDynamicPlaceholderSuffix, slugify, kindClass } from "../../graph-helpers";
import { buildTooltip } from "../../graph-tooltip";
import type { PlaceholderGroup } from "../../graph.types";
import { buildLabel } from "../../reference-graph-modal";
import { CONST } from "../../../../../constants/const";
import { appendCompoundGraphNode, createLayoutTree } from "./new-functions";

function ensurePlaceholderGroup(rawPath: string, placeholderGroups: Map<string, PlaceholderGroup>): PlaceholderGroup {
    const segments = rawPath.split("/").filter(Boolean).map(stripDynamicPlaceholderSuffix);
    const fullPath = segments.length > 0 ? segments.join("/") : rawPath;
    const existing = placeholderGroups.get(fullPath);
    if (existing) return existing;

    const parentPath = segments.slice(0, -1).join("/");
    const placeholderGroup: PlaceholderGroup = {
        id: `${REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_NODE_ID}-ph-${slugify(fullPath)}`,
        label: segments[segments.length - 1] ?? fullPath,
        parentId: parentPath ? ensurePlaceholderGroup(parentPath, placeholderGroups).id : REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_DEVICE_NODE_ID,
        controls: [],
    };
    placeholderGroups.set(fullPath, placeholderGroup);
    return placeholderGroup;
}

// export function buildLayoutNode(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[]) {
//     const placeholderGroups = new Map<string, PlaceholderGroup>();

//     if (graphReferenceResult.layoutSectionFields && graphReferenceResult.layoutSectionFields.length > 0) {
//         for (const layoutSectionField of graphReferenceResult.layoutSectionFields) {
//             for (const device in layoutSectionField.devices)
//                 for (const control of layoutSectionField.controls) {
//                     ensurePlaceholderGroup(control.placeholder ?? "(no placeholder)", placeholderGroups);
//                 }

//         }
//     }

//     // Every group (including pass-through ancestors with no controls of their own) is pushed
//     // before any control, so a control's own parent id always already exists in `nodes`.
//     placeholderGroups.forEach((group) => {
//         cytoNodes.push({
//             data: {
//                 id: group.id,
//                 parent: group.parentId,
//                 label: group.label,
//                 link: undefined,
//                 tooltip: buildTooltip(group.label, undefined, undefined),
//             },
//             classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
//         });
//     });

//     placeholderGroups.forEach((group) => {
//         group.layouts.controls.forEach(({ control, index }) => {
//             const controlId = control.renderingId || control.uid || `control-${index}`;
//             cytoNodes.push({
//                 data: {
//                     id: controlId,
//                     parent: group.id,
//                     // No kind-bracket suffix - nesting inside a placeholder group already makes "this is a
//                     // control" implicit, unlike every other node kind which can appear in more than one context.
//                     label: control.name ?? control.renderingId ?? "",
//                     link: control.link,
//                     tooltip: buildTooltip(control.name, control.renderingId, control.path, control.placeholder),
//                 },
//                 classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.CONTROL)} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
//             });

//             appendCompoundChildren(cytoNodes, controlId, [
//                 {
//                     kind: REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
//                     value: lastPathSegment(control.datasource) ?? control.datasource,
//                     link: control.datasourceLink,
//                     path: control.datasource,
//                     filterClass: REFERENCE_GRAPH.FILTER_CLASS.layout,
//                 },
//                 {
//                     kind: REFERENCE_GRAPH.NODE_KIND.VARIANT,
//                     value: control.parameters.Variant ?? undefined,
//                     link: undefined,
//                     filterClass: REFERENCE_GRAPH.FILTER_CLASS.layout,
//                 },
//             ]);
//         });
//     });
// }

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

/*
Original:

export function buildLayoutNodes(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    const hasLayoutData = Boolean(graphReferenceResult.layoutSectionFields);
    if (hasLayoutData) {
        BuildMainLayoutNode(cytoNodes);

        if (graphReferenceResult.layoutSectionFields) {
            for (const layout of graphReferenceResult.layoutSectionFields) {
                buildLayoutGroupNodes(layout, cytoNodes);
            }
        }
    }
}
*/

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
