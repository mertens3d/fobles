// @source-path [fobles] src/content/toolbar/reference-graph/components/node-builders/new-functions.ts

import { REFERENCE_GRAPH } from "../../../../../constants/graph.const";
import type { HarvestGraphControl, LayoutDevice, LayoutSectionField, SitecoreHarvestResult } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { kindClass, slugify, stripDynamicPlaceholderSuffix } from "../../graph-helpers";
import { lastPathSegment } from "../../cytoscape/graph-node-helpers";
import { buildLabel } from "../../cytoscape/graph-node-helpers";
import { buildFoblesUrl } from "../../../../features/augmentor/helper";
import { buildTooltip, buildTooltipContent } from "../../graph-tooltip";

function createScopedId(...parts: Array<string | undefined>): string {
    return parts
        .filter((part): part is string => Boolean(part))
        .map(slugify)
        .join("-");
}

type CompoundGraphNode = {
    id: string;
    label: string;
    kind: string;
    itemId?: string;
    path?: string;
    link?: string;
    drillDown?: boolean;
    tooltip?: HTMLElement;
    children: CompoundGraphNode[];
};

function createDeviceTree(
    layoutId: string,
    device: LayoutDevice,
    deviceIndex: number,
): CompoundGraphNode {
    const deviceNodeId = createScopedId(
        layoutId,
        "device",
        device.deviceId ?? String(deviceIndex),
    );

    return {
        id: deviceNodeId,
        label: buildLabel(
            REFERENCE_GRAPH.NODE_KIND.DEVICE,
            device.layoutView?.name ?? device.deviceId ?? "Unknown",
        ),
        kind: REFERENCE_GRAPH.NODE_KIND.DEVICE,
        itemId: device.deviceId,
        path: undefined,
        link: device.deviceId
            ? buildFoblesUrl(device.deviceId)
            : undefined,
        drillDown: Boolean(device.deviceId),
        tooltip: buildTooltipContent(
            buildTooltip(
                device.layoutView?.name ?? "Unknown device",
                device.deviceId,
                undefined,
            ),
        ),
        children: createPlaceholderTrees(
            deviceNodeId,
            device.controls,
        ),
    };
}

function createRenderingTree(
    deviceNodeId: string,
    control: HarvestGraphControl,
    controlIndex: number,
): CompoundGraphNode {
    const renderingNodeId = createScopedId(
        deviceNodeId,
        "rendering",
        control.uid ??
            control.renderingId ??
            String(controlIndex),
    );

    const children: CompoundGraphNode[] = [];

    if (control.datasource) {
        children.push({
            id: createScopedId(
                renderingNodeId,
                "datasource",
            ),
            label:
                lastPathSegment(control.datasource) ??
                control.datasource,
            kind: REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
            itemId: undefined,
            path: control.datasource,
            link: control.datasourceLink,
            drillDown: Boolean(control.datasourceLink),
            tooltip: buildTooltipContent(
                buildTooltip(
                    lastPathSegment(control.datasource),
                    undefined,
                    control.datasource,
                ),
            ),
            children: [],
        });
    }

    const parameters = Object.entries(control.parameters);

    if (parameters.length > 0) {
        children.push(
            createRenderingParametersTree(
                renderingNodeId,
                parameters,
            ),
        );
    }

    return {
        id: renderingNodeId,
        label:
            control.name ??
            control.renderingId ??
            "Unknown rendering",
        kind: REFERENCE_GRAPH.NODE_KIND.CONTROL,
        itemId: control.renderingId,
        path: control.path,
        link: control.link,
        drillDown: Boolean(control.renderingId),
        tooltip: buildTooltipContent(
            buildTooltip(
                control.name,
                control.renderingId,
                control.path,
                control.placeholder,
            ),
        ),
        children,
    };
}

function createRenderingParametersTree(
    renderingNodeId: string,
    parameters: Array<[string, string]>,
): CompoundGraphNode {
    return {
        id: createScopedId(
            renderingNodeId,
            "parameters",
        ),
        label: "Rendering Parameters",
        kind: "structural",
        tooltip: buildTooltipContent(
            buildTooltip(
                "Rendering Parameters",
                undefined,
                undefined,
            ),
        ),
        children: parameters.map(([name, value]) => ({
            id: createScopedId(
                renderingNodeId,
                "parameter",
                name,
            ),
            label: value ? `${name}: ${value}` : name,
            kind: "structural",
            tooltip: buildTooltipContent(
                buildTooltip(
                    name,
                    undefined,
                    value || undefined,
                ),
            ),
            children: [],
        })),
    };
}

export function appendCompoundGraphNode(
    node: CompoundGraphNode,
    cytoNodes: cytoscape.ElementDefinition[],
    parentId?: string,
): void {
    cytoNodes.push({
        data: {
            id: node.id,
            parent: parentId,
            label: node.label,
            itemId: node.itemId,
            path: node.path,
            link: node.link,
            drillDown: node.drillDown,
            tooltip: node.tooltip,
        },
        classes: `${kindClass(node.kind)} ${REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
    });

    node.children.forEach((child) => {
        appendCompoundGraphNode(
            child,
            cytoNodes,
            node.id,
        );
    });
}

export function createLayoutTree(
    graphReferenceResult: SitecoreHarvestResult,
): CompoundGraphNode {
    return {
        id: REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
        label: "Layout",
        kind: "structural",
        tooltip: buildTooltipContent(
            buildTooltip(
                "Layout",
                undefined,
                undefined,
            ),
        ),
        children: (graphReferenceResult.layoutSectionFields ?? []).map(
            createLayoutSectionTree,
        ),
    };
}

function createLayoutSectionTree(
    layout: LayoutSectionField,
): CompoundGraphNode {
    const layoutId = createScopedId(
        REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
        layout.name,
    );

    return {
        id: layoutId,
        label: layout.name ?? "",
        kind: "structural",
        tooltip: buildTooltipContent(
            buildTooltip(
                layout.name,
                undefined,
                undefined,
            ),
        ),
        children: (layout.devices ?? []).map((device, deviceIndex) =>
            createDeviceTree(
                layoutId,
                device,
                deviceIndex,
            ),
        ),
    };
}

function createPlaceholderTrees(
    deviceNodeId: string,
    controls: HarvestGraphControl[],
): CompoundGraphNode[] {
    const roots: CompoundGraphNode[] = [];
    const placeholders = new Map<string, CompoundGraphNode>();

    controls.forEach((control, controlIndex) => {
        const rawPath = control.placeholder || "(no placeholder)";

        const segments = rawPath
            .split("/")
            .filter(Boolean)
            .map(stripDynamicPlaceholderSuffix);

        const normalizedSegments =
            segments.length > 0
                ? segments
                : [rawPath];

        let parentChildren = roots;
        let currentPath = "";

        normalizedSegments.forEach((segment) => {
            currentPath = currentPath
                ? `${currentPath}/${segment}`
                : segment;

            let placeholder = placeholders.get(currentPath);

            if (!placeholder) {
                placeholder = {
                    id: createScopedId(
                        deviceNodeId,
                        "placeholder",
                        currentPath,
                    ),
                    label: segment,
                    kind: "structural",
                    tooltip: buildTooltipContent(
                        buildTooltip(
                            segment,
                            undefined,
                            currentPath,
                        ),
                    ),
                    children: [],
                };

                placeholders.set(currentPath, placeholder);
                parentChildren.push(placeholder);
            }

            parentChildren = placeholder.children;
        });

        parentChildren.push(
            createRenderingTree(
                deviceNodeId,
                control,
                controlIndex,
            ),
        );
    });

    return roots;
}

/*
Original equivalent responsibilities:

BuildMainLayoutNode(cytoNodes);

for (const layout of graphReferenceResult.layoutSectionFields) {
    buildLayoutGroupNodes(layout, cytoNodes);
}

function buildLayoutGroupNodes(...) {
    ...
    buildDeviceNodes(layout, cytoNodes);
}

function ensurePlaceholderGroup(...) {
    ...
}
*/