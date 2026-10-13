// @source-path [fobles] src/content/toolbar/reference-graph/components/node-builders/new-functions.ts

import type { HarvestGraphControl, LayoutDevice, LayoutSectionField, SitecoreHarvestResult } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { kindClass, slugify, stripDynamicPlaceholderSuffix } from "../../graph-helpers";
import { lastPathSegment } from "../../cytoscape/graph-node-helpers";
import { buildLabel } from "../../cytoscape/graph-node-helpers";
import { buildTooltip, buildTooltipContent } from "../../graph-tooltip";
import type { SatelliteDescriptor } from "../../reference-graph.types";
import { CONST } from "../../../../../constants/const";

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
    const item = device.layoutView;

    const descriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
        item,
        value: item?.name ?? "Unknown device",
        filterClass: CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS.layouts,
    };

    const deviceNodeId = createScopedId(
        layoutId,
        "device",
        device.deviceId ?? String(deviceIndex),
    );

    return {
        id: deviceNodeId,
        label: buildLabel(
            descriptor.kind,
            descriptor.item?.name ??
                device.deviceId ??
                "Unknown",
        ),
        kind: descriptor.kind,
        itemId: descriptor.item?.itemId,
        path: descriptor.item?.path,
        link: descriptor.item?.link,
        drillDown: Boolean(descriptor.item?.link),
        tooltip: buildTooltipContent(
            buildTooltip(descriptor),
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
    const rendering = control.rendering;

    const renderingNodeId = createScopedId(
        deviceNodeId,
        "rendering",
        control.uid ??
            rendering.itemId ??
            String(controlIndex),
    );

    const children: CompoundGraphNode[] = [];

    if (control.datasource) {
        const datasourceDescriptor: SatelliteDescriptor = {
            kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
            item: control.datasource,
        };

        children.push({
            id: createScopedId(
                renderingNodeId,
                "datasource",
            ),
            label:
                control.datasource.name ??
                lastPathSegment(control.datasource.path) ??
                control.datasource.itemId ??
                "Unknown datasource",
            kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
            itemId: control.datasource.itemId,
            path: control.datasource.path,
            link: control.datasource.link,
            drillDown: Boolean(control.datasource.link),
            tooltip: buildTooltipContent(
                buildTooltip(datasourceDescriptor),
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

    const renderingDescriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
        item: rendering,
        placeholder: control.placeholder,
    };

    return {
        id: renderingNodeId,
        label:
            rendering.name ??
            rendering.itemId ??
            "Unknown rendering",
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
        itemId: rendering.itemId,
        path: rendering.path,
        link: rendering.link,
        drillDown: Boolean(rendering.link),
        tooltip: buildTooltipContent(
            buildTooltip(renderingDescriptor),
        ),
        children,
    };
}
function createRenderingParametersTree(
    renderingNodeId: string,
    parameters: Array<[string, string]>,
): CompoundGraphNode {
    const parametersDescriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        value: "Rendering Parameters",
    };

    return {
        id: createScopedId(
            renderingNodeId,
            "parameters",
        ),
        label: "Rendering Parameters",
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        tooltip: buildTooltipContent(
            buildTooltip(parametersDescriptor),
        ),
        children: parameters.map(([name, value]) => {
            const parameterDescriptor: SatelliteDescriptor = {
                kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
                value: name,
                path: value || undefined,
            };

            return {
                id: createScopedId(
                    renderingNodeId,
                    "parameter",
                    name,
                ),
                label: value ? `${name}: ${value}` : name,
                kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
                tooltip: buildTooltipContent(
                    buildTooltip(parameterDescriptor),
                ),
                children: [],
            };
        }),
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
        classes: `${kindClass(node.kind)} ${CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
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
    const descriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        value: "Layouts",
    };

    return {
        id: CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
        label: descriptor.value ?? "",
        kind: descriptor.kind,
        tooltip: buildTooltipContent(
            buildTooltip(descriptor),
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
       CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
        layout.name,
    );

    const descriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        value: layout.name ?? "",
    };

    return {
        id: layoutId,
        label: descriptor.value ?? "",
        kind: descriptor.kind,
        tooltip: buildTooltipContent(
            buildTooltip(descriptor),
        ),
        children: (layout.devices ?? []).map(
            (device, deviceIndex) =>
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
                const descriptor: SatelliteDescriptor = {
                    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
                    value: segment,
                    path: currentPath,
                    placeholder: currentPath,
                };

                placeholder = {
                    id: createScopedId(
                        deviceNodeId,
                        "placeholder",
                        currentPath,
                    ),
                    label: segment,
                    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
                    tooltip: buildTooltipContent(
                        buildTooltip(descriptor),
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