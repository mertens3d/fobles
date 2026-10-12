// @source-path [fobles] src/content/toolbar/reference-graph/needs-home.ts

import type cytoscape from "cytoscape";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { buildTooltip } from "./graph-tooltip";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { buildLabel, appendCompoundChildren, appendSatellites, lastPathSegment } from "./reference-graph-modal";
import { CONST } from "../../../constants/const";
import { kindClass, slugify } from "./graph-helpers";
import type { SitecoreHarvestField, SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import type { HarvestFieldLink } from "../../sitecore-harvester/sitecore-harvester.types";
import { buildLayoutNodes } from "./components/node-builders/layout-nodes-builder";

export function buildElements(graphReferenceResult: SitecoreHarvestResult): cytoscape.ElementDefinition[] {
    const cytoNodes: cytoscape.ElementDefinition[] = [
        {
            data: {
                id: graphReferenceResult.rootItem.itemId,
                label: buildLabel(
                    REFERENCE_GRAPH.NODE_KIND.ITEM,
                    graphReferenceResult.rootItem.name ??
                    graphReferenceResult.rootItem.itemId ??
                    "Unknown item",
                ),
                link: graphReferenceResult.rootItem.link,
                tooltip: buildTooltip(graphReferenceResult.rootItem.name, graphReferenceResult.rootItem.itemId, graphReferenceResult.rootItem.path),
            },
            classes: kindClass(REFERENCE_GRAPH.NODE_KIND.ITEM),
        },
    ];
    const cytoEdges: cytoscape.ElementDefinition[] = [];

    // The item itself is the only guaranteed node - everything else (device/layout, controls,
    // template, parent, children, sections) only gets added when there's actual data for it.
    buildLayoutNodes(graphReferenceResult, cytoNodes, cytoEdges);
    buildTemplateNode(graphReferenceResult, cytoNodes, cytoEdges);
    buildParentNode(graphReferenceResult, cytoNodes, cytoEdges);
    buildChildNodes(graphReferenceResult, cytoNodes, cytoEdges);
    buildReferrerNode(graphReferenceResult, cytoNodes, cytoEdges);
    // buildLayoutNode(graphReferenceResult, cytoNodes);
    buildSectionsNode(graphReferenceResult, cytoNodes, cytoEdges);
    return [...cytoNodes, ...cytoEdges];
}

function buildParentNode(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    appendSatellites(cytoNodes, cytoEdges, graphReferenceResult.rootItem.itemId, [
        {
            kind: REFERENCE_GRAPH.NODE_KIND.PARENT,
            value: graphReferenceResult.parent?.name,
            link: graphReferenceResult.parent?.link,
            path: graphReferenceResult.parent?.path,
            filterClass: REFERENCE_GRAPH.FILTER_CLASS.parent,
        },
    ]);
}

function buildTemplateNode(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    appendSatellites(cytoNodes, cytoEdges, graphReferenceResult.rootItem.itemId, [
        {
            kind: REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
            value: lastPathSegment(graphReferenceResult.rootItem.template?.path ?? undefined),
            link: undefined,
            path: graphReferenceResult.rootItem.template?.path ?? undefined,
            filterClass: REFERENCE_GRAPH.FILTER_CLASS.template,
        }
    ]);
}

function buildSectionsNode(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    if (graphReferenceResult.sections) {

        graphReferenceResult.sections?.forEach((section) => {
            const sectionId = `${graphReferenceResult.rootItem.itemId}-section-${slugify(section.name)}`;
            cytoNodes.push({
                data: {
                    id: sectionId,
                    label: buildLabel(REFERENCE_GRAPH.NODE_KIND.SECTION, section.name),
                    link: undefined,
                    tooltip: buildTooltip(section.name, undefined, undefined),
                },
                classes: `${kindClass(REFERENCE_GRAPH.NODE_KIND.SECTION)} ${REFERENCE_GRAPH.FILTER_CLASS.sections}`,
            });
            cytoEdges.push({ data: { id: `edge-${sectionId}`, source: graphReferenceResult.rootItem.itemId, target: sectionId } });

            const fieldIds = appendCompoundChildren(
                cytoNodes,
                sectionId,
                section.fields.map((field: SitecoreHarvestField) => ({
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
                    cytoNodes,
                    cytoEdges,
                    fieldId,
                    field.links.map((link: HarvestFieldLink) => ({
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
}

function buildReferrerNode(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    // Same treatment for referrers - one "Referrers" box instead of each one spraying its own
    // edge in. The group's edge keeps the original reverse direction (referrers -> item).
    if (graphReferenceResult.referrers?.length && graphReferenceResult.referrers.length > 0) {
        const referrersId = `${graphReferenceResult.rootItem.itemId}-referrers`;
        cytoNodes.push({
            data: {
                id: referrersId,
                label: "Referrers",
                link: undefined,
                tooltip: buildTooltip(`${graphReferenceResult.referrers.length} item(s)`, undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.referrers}`,
        });
        cytoEdges.push({
            data: {
                id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.REFERRERS,
                source: referrersId,
                target: graphReferenceResult.rootItem.itemId
            }
        });

        appendCompoundChildren(
            cytoNodes,
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
}

function buildChildNodes(graphReferenceResult: SitecoreHarvestResult, cytoNodes: cytoscape.ElementDefinition[], cytoEdges: cytoscape.ElementDefinition[]) {
    // One compound "Children" box instead of each child spraying its own edge off the item -
    // same nesting cytoscape feature Section -> Fields already uses below.
    if (graphReferenceResult.childItems?.length && graphReferenceResult.childItems.length > 0) {
        const childrenId = `${graphReferenceResult.rootItem.itemId}-children`;
        cytoNodes.push({
            data: {
                id: childrenId,
                label: "Children",
                link: undefined,
                tooltip: buildTooltip(`${graphReferenceResult.childItems.length} item(s)`, undefined, undefined),
            },
            classes: `${kindClass("structural")} ${REFERENCE_GRAPH.FILTER_CLASS.children}`,
        });
        cytoEdges.push({ data: { id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.CHILDREN, source: graphReferenceResult.rootItem.itemId, target: childrenId } });

        appendCompoundChildren(
            cytoNodes,
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
}
