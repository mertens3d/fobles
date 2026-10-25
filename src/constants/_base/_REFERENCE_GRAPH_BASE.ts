import type { SitecoreHarvestFiltersState } from "../../content/foundation/harvesting/sitecore-harvester.types";

export type NodeKind =
    typeof _REFERENCE_GRAPH_BASE.NODE_KIND[
    keyof typeof _REFERENCE_GRAPH_BASE.NODE_KIND
    ];

export const _REFERENCE_GRAPH_BASE = {
    NODE_KIND: {
        // Prefixed onto every node's label (e.g. "CONTROL\nFobles Header") so it's clear at a glance
        // what kind of thing a node represents, without needing to hover.
        ROOT: "Root",
        DEVICE: "Device",
        ITEM: "Item",
        CONTROL: "Control",
        DATASOURCE: "Datasource",
        VARIANT: "Variant",
        TEMPLATE: "Template",
        PAGE_LAYOUT: "Page Layout",
        LAYOUTS: "Layouts",
        SECTION: "Section",
        PARENT: "Parent",
        CHILD: "Child",
        PLACEHOLDER: "Placeholder",
        REFERRER: "Referrer",
        RENDERING: "Rendering",
        RENDERING_PARAMETER: "Rendering Parameter",
        // Not a real label prefix (each field keeps its own field name as its label) - just the color
        // category every section field node shares, since there's no fixed/finite set of field names.
        FIELD: "Field",
        STRUCTURAL: "Structural"
    } as const,    // Toggleable node groups - each maps to a cytoscape class applied in buildElements, shown/hidden
    // via style("display", ...) rather than rebuilding the graph. Hiding a node also hides any edges
    // attached to it (cytoscape's own behavior), so no edge bookkeeping is needed here.
    FILTER_CLASS: {
        parent: "fobles-reference-graph-filter-parent",
        children: "fobles-reference-graph-filter-children",
        layouts: "fobles-reference-graph-filter-layout",
        referrers: "fobles-reference-graph-filter-referrers",
        customFields: "fobles-reference-graph-filter-custom-fields",
        standardFields: "fobles-reference-graph-filter-standard-fields",
        template: "fobles-reference-graph-filter-template",
    } as const satisfies Record<keyof SitecoreHarvestFiltersState, string>,
};
