import type { ReferenceGraphFiltersState } from "../../content/toolbar/reference-graph/graph.types";

export const _REFERENCE_GRAPH_BASE = {
    NODE_KIND: {
        // Prefixed onto every node's label (e.g. "CONTROL\nFobles Header") so it's clear at a glance
        // what kind of thing a node represents, without needing to hover.
        DEVICE: "Device",
        ITEM: "Item",
        CONTROL: "Control",
        DATASOURCE: "Datasource",
        VARIANT: "Variant",
        TEMPLATE: "Template",
        LAYOUT: "Layout",
        SECTION: "Section",
        PARENT: "Parent",
        CHILD: "Child",
        REFERRER: "Referrer",
        // Not a real label prefix (each field keeps its own field name as its label) - just the color
        // category every section field node shares, since there's no fixed/finite set of field names.
        FIELD: "Field",
    },    // Toggleable node groups - each maps to a cytoscape class applied in buildElements, shown/hidden
        // via style("display", ...) rather than rebuilding the graph. Hiding a node also hides any edges
        // attached to it (cytoscape's own behavior), so no edge bookkeeping is needed here.
        FILTER_CLASS: {
            parent: "fobles-reference-graph-filter-parent",
            children: "fobles-reference-graph-filter-children",
            layout: "fobles-reference-graph-filter-layout",
            referrers: "fobles-reference-graph-filter-referrers",
            sections: "fobles-reference-graph-filter-sections",
            template: "fobles-reference-graph-filter-template",
            controls: "fobles-reference-graph-filter-controls",
        } as const satisfies Record<keyof ReferenceGraphFiltersState, string>,
};
