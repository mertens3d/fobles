import type cytoscape from "cytoscape";
import { slugify, kindClass } from "../graph-helpers";
import { buildTooltip } from "../graph-tooltip";
import type { SatelliteDescriptor } from "../reference-graph.types";
import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";

export function buildLabel(kind: string, name: string): string {
    return `${name}\n[${kind.toLowerCase()}]`;
}

export function lastPathSegment(
    path: string | undefined,
): string | undefined {
    return path?.split("/").filter(Boolean).pop() ?? undefined;
}

export function appendSatellites(
    nodes: cytoscape.ElementDefinition[],
    edges: cytoscape.ElementDefinition[],
    parentId: string,
    descriptors: SatelliteDescriptor[],
): void {
    descriptors.forEach((descriptor, index) => {
        const value =
            descriptor.value ??
            descriptor.item?.scItemName;

        if (!value) return;

        const link =
            descriptor.item?.link;

        const nodeId =
            `${parentId}-${slugify(descriptor.kind)}-${index}`;

        nodes.push({
            data: {
                id: nodeId,
                ...(descriptor.compoundParent
                    ? { parent: descriptor.compoundParent }
                    : {}),
                label: descriptor.plainLabel
                    ? value
                    : buildLabel(descriptor.kind, value),
                link,
                tooltip: buildTooltip(descriptor),
            },
            classes: [
                kindClass(
                    descriptor.category ??
                    descriptor.kind,
                ),
                descriptor.filterClass,
            ]
                .filter(Boolean)
                .join(" "),
        });

        edges.push({
            data: descriptor.reverse
                ? {
                    id: `edge-${nodeId}`,
                    source: nodeId,
                    target: parentId,
                }
                : {
                    id: `edge-${nodeId}`,
                    source: parentId,
                    target: nodeId,
                },
        });
    });
}

export function appendCompoundChildren(
    nodes: cytoscape.ElementDefinition[],
    parentId: string,
    descriptors: SatelliteDescriptor[],
): Array<string | undefined> {
    return descriptors.map((descriptor, index) => {
        const value =
            descriptor.value ??
            descriptor.item?.scItemName;

        if (!value) return undefined;

        const link =
            descriptor.item?.link 

        const nodeId =
            `${parentId}-${slugify(descriptor.kind)}-${index}`;

        nodes.push({
            data: {
                id: nodeId,
                parent: parentId,
                label: descriptor.plainLabel
                    ? value
                    : buildLabel(descriptor.kind, value),
                link,
                tooltip: buildTooltip(descriptor),
            },
            classes: [
                kindClass(
                    descriptor.category ??
                    descriptor.kind,
                ),
                descriptor.filterClass,
            ]
                .filter(Boolean)
                .join(" "),
        });

        return nodeId;
    });
}

export function createItemSatelliteDescriptor(
    item: ItemGraphNodeData,
    kind: NodeKind,
    filterClass: string,
): SatelliteDescriptor {
    return {
        kind,
        item,
        filterClass,
        plainLabel: true,
    };
}