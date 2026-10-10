import type cytoscape from "cytoscape";
import type { ReferenceGraphFiltersState } from "../content/toolbar/reference-graph/graph.types";
import type { LayoutPreset, LayoutGraphPresetName, BuildStepKey } from "../content/toolbar/reference-graph/graph.types";
import { _REFERENCE_GRAPH_BASE } from "./_base/_REFERENCE_GRAPH_BASE";

export const REFERENCE_GRAPH = {
    TEXT: {
        BUILDING_REFERENCE_GRAPH: "Building reference graph..."
    },
    EDGE_IDS:{
        EDGE_LAYOUT: "edge-layout",
        CHILDREN: "edge-children",
        REFERRERS: "edge-referrers"
    },
    EXCLUSIONS: {
        // Sections/fields already represented elsewhere in the graph, or not useful for this POC's
        // purposes (Statistics/Security/Appearance are noisy system bookkeeping, not content-shape data).
        // Quick Info is also a differently-shaped table (see getQuickInfoValue), not a field-marker
        // section; Renderings/Final renderings get their own rich subtree (parseDevice) instead of a
        // flat raw-value leaf.
        EXCLUDED_SECTION_NAMES: new Set(["appearance", "quick info", "security", "statistics"]),
        EXCLUDED_FIELD_LABEL_PREFIXES: ["final renderings", "renderings"],
    },
    FILTER_CLASS: _REFERENCE_GRAPH_BASE.FILTER_CLASS,
    NODE_ID: {
        // Fixed structural wrapper nodes (the two layout XML sources everything else is parsed from, and
        // the Default device each currently wraps) rather than real Sitecore items, so they get plain
        // labels, not a kind prefix. Mirrors Sitecore's own Layout dialog: Renderings (Shared Layout) and
        // Final renderings (Final Layout) each have their own per-device tree, not one device shared by
        // both - only the Default device is harvested today (see reference-graph.ts), so that's the only
        // one nested under each; Mobile/Print/... would nest the exact same way once harvested.
        SHARED_LAYOUT_NODE_ID: "fobles-reference-graph-shared-layout",
        SHARED_LAYOUT_DEVICE_NODE_ID: "fobles-reference-graph-shared-layout-device-default",
        FINAL_LAYOUT_NODE_ID: "fobles-reference-graph-final-layout",
        FINAL_LAYOUT_DEVICE_NODE_ID: "fobles-reference-graph-final-layout-device-default",
        // The one compound box everything above lives inside - its own self-contained subgraph (same
        // internal edges as before), with a single edge back to the root item crossing the box itself.
        LAYOUT_BOX_NODE_ID: "fobles-reference-graph-layout-box",

    },
    NODE_KIND: _REFERENCE_GRAPH_BASE.NODE_KIND,
    KIND_COLORS: {
        // One distinct color per kind instead of the old flat "dashed = satellite" look - a structural
        // (non-identity) container cue, like the Section compound box's dashed border below, still
        // layers on top of this independently.
        [_REFERENCE_GRAPH_BASE.NODE_KIND.ITEM]: "#2f6fed",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.DEVICE]: "#5a6b80",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.CONTROL]: "#1f9d55",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.DATASOURCE]: "#c9820f",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.VARIANT]: "#8a3fd6",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.TEMPLATE]: "#0f9aa0",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.LAYOUT]: "#9a5b1f",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.SECTION]: "#555566",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.PARENT]: "#b8860b",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.CHILD]: "#d1428a",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.REFERRER]: "#d13f3f",
        [_REFERENCE_GRAPH_BASE.NODE_KIND.FIELD]: "#7a7a7a",
    } as Record<string, string>,
    STRUCTURAL_COLOR: "#8a97a8", // Device/Shared Layout/Final Layout wrapper nodes
    DEFAULT_LAYOUT_PRESET_NAME: "dagre" as LayoutGraphPresetName,
    FILTER_DEFS: [
        { key: "parent", buildStepKey: "parent", label: "Parent", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.parent },
        { key: "children", buildStepKey: "children", label: "Children", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.children },
        { key: "layout", buildStepKey: "layout", label: "Layout", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.layout },
        { key: "referrers", buildStepKey: "referrers", label: "Referrers", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.referrers },
        { key: "sections", buildStepKey: "sections", label: "Sections", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.sections },
        { key: "template", buildStepKey: "template", label: "Template", className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.template },
    ] as ReadonlyArray<{ key: keyof ReferenceGraphFiltersState; buildStepKey: BuildStepKey; label: string; className: string; }>,
    DIALOG_ID: "fobles-reference-graph-dialog",
    PROGRESS_DIALOG_ID: "fobles-reference-graph-progress-dialog",
    PROGRESS_MESSAGE_ID: "fobles-reference-graph-progress-message",

    // None of these three extensions' option types are merged into cytoscape core's LayoutOptions
    // union (unlike cytoscape-popper's SingularData merge below) - each factory below casts its own
    // options object at the point of use, which is just filling that typing gap, not a real risk.
    LAYOUT_PRESETS: {
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
    } as Record<LayoutGraphPresetName, LayoutPreset>,
    DEFAULT_LAYOUT_PRESET: { LayoutPresetName: "dagre" },
    // Sections/fields already represented elsewhere in the graph, or not useful for this POC's
    // purposes (Statistics/Security/Appearance are noisy system bookkeeping, not content-shape data).
    // Quick Info is also a differently-shaped table (see getQuickInfoValue), not a field-marker
    // section; Renderings/Final renderings get their own rich subtree (parseDevice) instead of a
    // flat raw-value leaf.
    EXCLUDED_SECTION_NAMES: new Set(["appearance", "quick info", "security", "statistics"]),
    EXCLUDED_FIELD_LABEL_PREFIXES: ["final renderings", "renderings"],
    //i guessed on this

};