import type cytoscape from "cytoscape";
import type { RenderingGraphFilters } from "../../../shared/rendering-graph-settings";
import type { LayoutPreset, LayoutPresetName } from "./graph.types";

export const _GRAPH_BASE = {
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
    },

};

export const GRAPHCONST = {
    EXCLUSIONS: {

        // Sections/fields already represented elsewhere in the graph, or not useful for this POC's
        // purposes (Statistics/Security/Appearance are noisy system bookkeeping, not content-shape data).
        // Quick Info is also a differently-shaped table (see getQuickInfoValue), not a field-marker
        // section; Renderings/Final renderings get their own rich subtree (parseDevice) instead of a
        // flat raw-value leaf.
        EXCLUDED_SECTION_NAMES: new Set(["appearance", "quick info", "security", "statistics"]),
        EXCLUDED_FIELD_LABEL_PREFIXES: ["final renderings", "renderings"],
    },

    NODE_ID: {
        // Fixed structural wrapper nodes (the two layout XML sources everything else is parsed from, and
        // the Default device each currently wraps) rather than real Sitecore items, so they get plain
        // labels, not a kind prefix. Mirrors Sitecore's own Layout dialog: Renderings (Shared Layout) and
        // Final renderings (Final Layout) each have their own per-device tree, not one device shared by
        // both - only the Default device is harvested today (see rendering-graph.ts), so that's the only
        // one nested under each; Mobile/Print/... would nest the exact same way once harvested.
        SHARED_LAYOUT_NODE_ID: "fobles-rendering-graph-shared-layout",
        SHARED_LAYOUT_DEVICE_NODE_ID: "fobles-rendering-graph-shared-layout-device-default",
        FINAL_LAYOUT_NODE_ID: "fobles-rendering-graph-final-layout",
        FINAL_LAYOUT_DEVICE_NODE_ID: "fobles-rendering-graph-final-layout-device-default",
        // The one compound box everything above lives inside - its own self-contained subgraph (same
        // internal edges as before), with a single edge back to the root item crossing the box itself.
        LAYOUT_BOX_NODE_ID: "fobles-rendering-graph-layout-box",

    },
    NODE_KIND: _GRAPH_BASE.NODE_KIND,
    KIND_COLORS: {
        // One distinct color per kind instead of the old flat "dashed = satellite" look - a structural
        // (non-identity) container cue, like the Section compound box's dashed border below, still
        // layers on top of this independently.
        [_GRAPH_BASE.NODE_KIND.ITEM]: "#2f6fed",
        [_GRAPH_BASE.NODE_KIND.DEVICE]: "#5a6b80",
        [_GRAPH_BASE.NODE_KIND.CONTROL]: "#1f9d55",
        [_GRAPH_BASE.NODE_KIND.DATASOURCE]: "#c9820f",
        [_GRAPH_BASE.NODE_KIND.VARIANT]: "#8a3fd6",
        [_GRAPH_BASE.NODE_KIND.TEMPLATE]: "#0f9aa0",
        [_GRAPH_BASE.NODE_KIND.LAYOUT]: "#9a5b1f",
        [_GRAPH_BASE.NODE_KIND.SECTION]: "#555566",
        [_GRAPH_BASE.NODE_KIND.PARENT]: "#b8860b",
        [_GRAPH_BASE.NODE_KIND.CHILD]: "#d1428a",
        [_GRAPH_BASE.NODE_KIND.REFERRER]: "#d13f3f",
        [_GRAPH_BASE.NODE_KIND.FIELD]: "#7a7a7a",
    } as Record<string, string>


};
export const STRUCTURAL_COLOR = "#8a97a8"; // Device/Shared Layout/Final Layout wrapper nodesexport const DEFAULT_LAYOUT_PRESET = "dagre";
// Toggleable node groups - each maps to a cytoscape class applied in buildElements, shown/hidden
// via style("display", ...) rather than rebuilding the graph. Hiding a node also hides any edges
// attached to it (cytoscape's own behavior), so no edge bookkeeping is needed here.
export const FILTER_CLASS = {
    parent: "fobles-rendering-graph-filter-parent",
    children: "fobles-rendering-graph-filter-children",
    layout: "fobles-rendering-graph-filter-layout",
    referrers: "fobles-rendering-graph-filter-referrers",
    sections: "fobles-rendering-graph-filter-sections",
    template: "fobles-rendering-graph-filter-template",
} as const satisfies Record<keyof RenderingGraphFilters, string>;
export const FILTER_DEFS: ReadonlyArray<{ key: keyof RenderingGraphFilters; label: string; className: string; }> = [
    { key: "parent", label: "Parent", className: FILTER_CLASS.parent },
    { key: "children", label: "Children", className: FILTER_CLASS.children },
    { key: "layout", label: "Layout", className: FILTER_CLASS.layout },
    { key: "referrers", label: "Referrers", className: FILTER_CLASS.referrers },
    { key: "sections", label: "Sections", className: FILTER_CLASS.sections },
    { key: "template", label: "Template", className: FILTER_CLASS.template },
];
export const DIALOG_ID = "fobles-rendering-graph-dialog";
export const PROGRESS_DIALOG_ID = "fobles-rendering-graph-progress-dialog";
export const PROGRESS_MESSAGE_ID = "fobles-rendering-graph-progress-message";

// None of these three extensions' option types are merged into cytoscape core's LayoutOptions
// union (unlike cytoscape-popper's SingularData merge below) - each factory below casts its own
// options object at the point of use, which is just filling that typing gap, not a real risk.
export const LAYOUT_PRESETS: Record<string, { label: string; build: () => cytoscape.LayoutOptions; }> = {
    dagre: {
        label: "Dagre (tree)",
        build: () => ({ name: "dagre", rankDir: "TB", nodeSep: 30, rankSep: 60, padding: 20 }) as unknown as cytoscape.LayoutOptions,
    },
    "cose-bilkent": {
        label: "CoSE Bilkent (organic)",
        build: () => ({
            name: "cose-bilkent",
            padding: 20,
            nodeDimensionsIncludeLabels: true
        }) as unknown as cytoscape.LayoutOptions,
    },
    fcose: {
        label: "fCoSE (organic, fast)",
        build: () => ({ name: "fcose", padding: 20 }) as unknown as cytoscape.LayoutOptions,
    },
    breadthfirst: {
        label: "Breadthfirst (tree, directed)",
        // circle:true puts the root dead-center with every rank as a ring around it - circle:false
        // instead stacks ranks as flat rows, root at the top, same as dagre's general shape.
        build: () => ({ name: "breadthfirst", directed: true, circle: false, padding: 20 }),
    },
} satisfies Record<LayoutPresetName, LayoutPreset>;

export const DEFAULT_LAYOUT_PRESET: LayoutPresetName = "dagre";


// Sections/fields already represented elsewhere in the graph, or not useful for this POC's
// purposes (Statistics/Security/Appearance are noisy system bookkeeping, not content-shape data).
// Quick Info is also a differently-shaped table (see getQuickInfoValue), not a field-marker
// section; Renderings/Final renderings get their own rich subtree (parseDevice) instead of a
// flat raw-value leaf.
export const EXCLUDED_SECTION_NAMES = new Set(["appearance", "quick info", "security", "statistics"]);
export const EXCLUDED_FIELD_LABEL_PREFIXES = ["final renderings", "renderings"];
//i guessed on this