// @source-path [fobles] src/content/toolbar/reference-graph/needs-home.ts

import type cytoscape from "cytoscape";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { buildTooltip } from "./graph-tooltip";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { buildLabel,  appendCompoundChildren, appendSatellites, lastPathSegment } from "./reference-graph-modal";
import type { ReferenceGraphResult } from "./reference-graph.types";
import type { PlaceholderGroup } from "./graph.types";
import { CONST } from "../../../constants/const";
import { kindClass, slugify, stripDynamicPlaceholderSuffix } from "./graph-helpers";


export function buildElements(graphReferenceResult: ReferenceGraphResult): cytoscape.ElementDefinition[] {
    const nodes: cytoscape.ElementDefinition[] = [
        {
            data: {
                id:  graphReferenceResult.rootItem.itemId,
                label: buildLabel(REFERENCE_GRAPH.NODE_KIND.ITEM,
                     graphReferenceResult.rootItem.name ?? graphReferenceResult.rootItem.itemId),
                link: graphReferenceResult.rootItem.link,
                tooltip: buildTooltip(graphReferenceResult.rootItem.name, graphReferenceResult.rootItem.itemId, graphReferenceResult.rootItem.path),
            },
            classes: kindClass(REFERENCE_GRAPH.NODE_KIND.ITEM),
        },
    ];
    const edges: cytoscape.ElementDefinition[] = [];

    // The item itself is the only guaranteed node - everything else (device/layout, controls,
    // template, parent, children, sections) only gets added when there's actual data for it.
    const hasLayoutData = (graphReferenceResult.controls?.length && graphReferenceResult.controls.length > 0) || Boolean(graphReferenceResult.sharedLayoutName);
    if (hasLayoutData) {
        // Layout wraps Shared Layout (Renderings) and Final Layout (Final renderings), each of which
        // wraps its own Default device - mirrors Sitecore's own Layout Details dialog, where each
        // field independently lists Default/Mobile/Print/... rather than sharing one device node.
        nodes.push(
            {
                data: {
                    id: REFERENCE_GRAPH.NODE_ID.LAYOUT_BOX_NODE_ID,
                    label: "Layout",
                    link: undefined,
                    tooltip: buildTooltip("Layout (device/renderings/datasources)", undefined, undefined),
                },
                classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            },
            {
                data: {
                    id: REFERENCE_GRAPH.NODE_ID.SHARED_LAYOUT_NODE_ID,
                    parent: REFERENCE_GRAPH.NODE_ID.LAYOUT_BOX_NODE_ID,
                    label: "Shared Layout",
                    link: undefined,
                    tooltip: buildTooltip("Shared Layout (Renderings field)", undefined, undefined),
                },
                classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            },
            {
                data: {
                    id: REFERENCE_GRAPH.NODE_ID.SHARED_LAYOUT_DEVICE_NODE_ID,
                    parent: REFERENCE_GRAPH.NODE_ID.SHARED_LAYOUT_NODE_ID,
                    label: buildLabel(REFERENCE_GRAPH.NODE_KIND.DEVICE, "Default"),
                    link: undefined,
                    tooltip: buildTooltip("Default device", undefined, undefined),
                },
                classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.DEVICE)} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            },
            {
                data: {
                    id: REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_NODE_ID,
                    parent: REFERENCE_GRAPH.NODE_ID.LAYOUT_BOX_NODE_ID,
                    label: "Final Layout",
                    link: undefined,
                    tooltip: buildTooltip("Final Layout (Final renderings field)", undefined, undefined),
                },
                classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            },
            {
                data: {
                    id: REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_DEVICE_NODE_ID,
                    parent: REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_NODE_ID,
                    label: buildLabel(REFERENCE_GRAPH.NODE_KIND.DEVICE, "Default"),
                    link: undefined,
                    tooltip: buildTooltip("Default device", undefined, undefined),
                },
                classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.DEVICE)} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            }
        );
        edges.push({
            data: {
                id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.EDGE_LAYOUT,
                source: graphReferenceResult.rootItem.itemId,
                target: REFERENCE_GRAPH.NODE_ID.LAYOUT_BOX_NODE_ID
            }
        });

        appendCompoundChildren(nodes, REFERENCE_GRAPH.NODE_ID.SHARED_LAYOUT_DEVICE_NODE_ID, [
            {
                kind: REFERENCE_GRAPH.NODE_KIND.LAYOUT,
                value: graphReferenceResult.sharedLayoutName,
                link: graphReferenceResult.sharedLayoutLink,
                path: graphReferenceResult.sharedLayoutPath,
                filterClass: REFERENCE_GRAPH.FILTER_CLASS.layout,
            },
        ]);
    }

    appendSatellites(nodes, edges, graphReferenceResult.rootItem.itemId, [
        {
            kind: REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
            value: lastPathSegment(graphReferenceResult.rootItem.template),
            link: graphReferenceResult.rootItem.templateLink,
            path: graphReferenceResult.rootItem.template,
            filterClass: REFERENCE_GRAPH.FILTER_CLASS.template,
        },
        {
            kind: REFERENCE_GRAPH.NODE_KIND.PARENT,
            value: graphReferenceResult.parent?.name,
            link: graphReferenceResult.parent?.link,
            path: graphReferenceResult.parent?.path,
            filterClass: REFERENCE_GRAPH.FILTER_CLASS.parent,
        },
    ]);

    // One compound "Children" box instead of each child spraying its own edge off the item -
    // same nesting cytoscape feature Section -> Fields already uses below.
    if (graphReferenceResult.childItems?.length && graphReferenceResult.childItems.length > 0) {
        const childrenId = `${graphReferenceResult.rootItem.itemId}-children`;
        nodes.push({
            data: {
                id: childrenId,
                label: "Children",
                link: undefined,
                tooltip: buildTooltip(`${graphReferenceResult.childItems.length} item(s)`, undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.children}`,
        });
        edges.push({ data: { id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.CHILDREN, source: graphReferenceResult.rootItem.itemId, target: childrenId } });

        appendCompoundChildren(
            nodes,
            childrenId,
            graphReferenceResult.childItems.map((child) => ({
                kind: REFERENCE_GRAPH.NODE_KIND.CHILD,
                value: child.name,
                link: child.link,
                filterClass: REFERENCE_GRAPH.FILTER_CLASS.children,
                plainLabel: true,
            }))
        );
    }

    // Same treatment for referrers - one "Referrers" box instead of each one spraying its own
    // edge in. The group's edge keeps the original reverse direction (referrers -> item).
    if (graphReferenceResult.referrers?.length && graphReferenceResult.referrers.length > 0) {
        const referrersId = `${graphReferenceResult.rootItem.itemId}-referrers`;
        nodes.push({
            data: {
                id: referrersId,
                label: "Referrers",
                link: undefined,
                tooltip: buildTooltip(`${graphReferenceResult.referrers.length} item(s)`, undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.referrers}`,
        });
        edges.push({
            data: {
                id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.REFERRERS,
                source: referrersId,
                target: graphReferenceResult.rootItem.itemId
            }
        });

        appendCompoundChildren(
            nodes,
            referrersId,
            graphReferenceResult.referrers.map((referrer) => ({
                kind: REFERENCE_GRAPH.NODE_KIND.REFERRER,
                value: referrer.name,
                link: referrer.link,
                path: referrer.path,
                filterClass: REFERENCE_GRAPH.FILTER_CLASS.referrers,
                plainLabel: true,
            }))
        );
    }

    const placeholderGroups = new Map<string, PlaceholderGroup>();
    function ensurePlaceholderGroup(rawPath: string): PlaceholderGroup {
        const segments = rawPath.split("/").filter(Boolean).map(stripDynamicPlaceholderSuffix);
        const fullPath = segments.length > 0 ? segments.join("/") : rawPath;
        const existing = placeholderGroups.get(fullPath);
        if (existing) return existing;

        const parentPath = segments.slice(0, -1).join("/");
        const group: PlaceholderGroup = {
            id: `${REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_NODE_ID}-ph-${slugify(fullPath)}`,
            label: segments[segments.length - 1] ?? fullPath,
            parentId: parentPath ? ensurePlaceholderGroup(parentPath).id : REFERENCE_GRAPH.NODE_ID.FINAL_LAYOUT_DEVICE_NODE_ID,
            controls: [],
        };
        placeholderGroups.set(fullPath, group);
        return group;
    }

    if (graphReferenceResult.controls) {

        graphReferenceResult.controls.forEach((control, index) => {
            ensurePlaceholderGroup(control.placeholder ?? "(no placeholder)").controls.push({ control, index });
        });

        // Every group (including pass-through ancestors with no controls of their own) is pushed
        // before any control, so a control's own parent id always already exists in `nodes`.
        placeholderGroups.forEach((group) => {
            nodes.push({
                data: {
                    id: group.id,
                    parent: group.parentId,
                    label: group.label,
                    link: undefined,
                    tooltip: buildTooltip(group.label, undefined, undefined),
                },
                classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
            });
        });

        placeholderGroups.forEach((group) => {
            group.controls.forEach(({ control, index }) => {
                const controlId = control.renderingId || control.uid || `control-${index}`;
                nodes.push({
                    data: {
                        id: controlId,
                        parent: group.id,
                        // No kind-bracket suffix - nesting inside a placeholder group already makes "this is a
                        // control" implicit, unlike every other node kind which can appear in more than one context.
                        label: control.name ?? control.renderingId ?? "",
                        link: control.link,
                        tooltip: buildTooltip(control.name, control.renderingId, control.path, control.placeholder),
                    },
                    classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.CONTROL)} ${REFERENCE_GRAPH.FILTER_CLASS.layout}`,
                });

                appendCompoundChildren(nodes, controlId, [
                    {
                        kind: REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
                        value: lastPathSegment(control.datasource) ?? control.datasource,
                        link: control.datasourceLink,
                        path: control.datasource,
                        filterClass: REFERENCE_GRAPH.FILTER_CLASS.layout,
                    },
                    {
                        kind: REFERENCE_GRAPH.NODE_KIND.VARIANT,
                        value: control.parameters.Variant ?? undefined,
                        link: undefined,
                        filterClass: REFERENCE_GRAPH.FILTER_CLASS.layout,
                    },
                ]);
            });
        });
    }

    if (graphReferenceResult.sections) {

        graphReferenceResult.sections?.forEach((section) => {
            const sectionId = `${graphReferenceResult.rootItem.itemId}-section-${slugify(section.name)}`;
            nodes.push({
                data: {
                    id: sectionId,
                    label: buildLabel(REFERENCE_GRAPH.NODE_KIND.SECTION, section.name),
                    link: undefined,
                    tooltip: buildTooltip(section.name, undefined, undefined),
                },
                classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.SECTION)} ${REFERENCE_GRAPH.FILTER_CLASS.sections}`,
            });
            edges.push({ data: { id: `edge-${sectionId}`, source: graphReferenceResult.rootItem.itemId, target: sectionId } });

            const fieldIds = appendCompoundChildren(
                nodes,
                sectionId,
                section.fields.map((field) => ({
                    kind: field.label,
                    value: field.value,
                    category: REFERENCE_GRAPH.NODE_KIND.FIELD,
                    filterClass: REFERENCE_GRAPH.FILTER_CLASS.sections,
                }))
            );

            // Fields a link-strategy recognized (reference-graph-field-links.ts) get their referenced
            // items as their own clickable satellites, hung off the field's own compound node.
            section.fields.forEach((field, index) => {
                const fieldId = fieldIds[index];
                if (!fieldId || !field.links) return;
                appendSatellites(
                    nodes,
                    edges,
                    fieldId,
                    field.links.map((link) => ({
                        kind: REFERENCE_GRAPH.NODE_KIND.FIELD,
                        value: link.label,
                        link: buildFoblesUrl(link.itemId),
                        path: link.itemId,
                        filterClass: REFERENCE_GRAPH.FILTER_CLASS.sections,
                    }))
                );
            });
        });
    }

    return [...nodes, ...edges];
}
