import { buildElements } from "./needs-home";
import { type SatelliteDescriptor } from "./reference-graph.types";
import cytoscape from "cytoscape";
import cytoscapeCoseBilkent from "cytoscape-cose-bilkent";
import cytoscapeDagre from "cytoscape-dagre";
import cytoscapeFcose from "cytoscape-fcose";
import cytoscapePopper from "cytoscape-popper";
import tippy from "tippy.js";
import { extensionLog } from "../../logger";
import { getReferenceGraphFilters, getReferenceGraphLayoutName, setReferenceGraphFilters, setReferenceGraphLayout } from "../../../shared/reference-graph-settings";
import type { ReferenceGraphResult } from "./reference-graph.types";
import { createCloseButton } from "./close-button";
import { attachGraphEventHandlers } from "./event-handlers";
import { buildTooltip, hideActiveTooltip } from "./graph-tooltip";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { DEFAULT_RENDERING_GRAPH_FILTERS_STATE } from "./graph-filters";
import { kindClass, slugify } from "./graph-helpers";
import { createRoot } from "react-dom/client";
import { GraphToolbar } from "./components/graph-toolbar";

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeFcose);

// dialog.showModal() renders the dialog in the browser's top layer, above everything else in
// the document - a tippy popper appended to document.body would render behind it. Tracking the
// open dialog here lets the popper factory append into it instead, so tooltips stay visible.
let activeReferenceGraphDialog: HTMLElement | undefined = undefined;

// Registers the popper <-> tippy bridge once per content-script load. Content/arrow are styled
// inline on our own div below rather than via tippy's own stylesheet, since importing CSS from a
// content-script .ts file would need its own esbuild/manifest wiring (not worth it for a POC).
cytoscape.use(
  cytoscapePopper((ref, content) =>
    tippy(document.createElement("div"), {
      getReferenceClientRect: ref.getBoundingClientRect,
      trigger: "manual",
      content,
      arrow: false,
      placement: "top",
      hideOnClick: false,
      appendTo: () => activeReferenceGraphDialog ?? document.body,
    }),
  ),
);
extensionLog.debug("Reference graph: cytoscape-popper/tippy bridge registered");

export function buildLabel(kind: string, name: string): string {
  return `${name}\n[${kind.toLowerCase()}]`;
}

// Several referenced-item fields arrive as a full Sitecore path, not just a name - shown
// shortened on the node itself, with the full path still available via its tooltip.
export function lastPathSegment(path: string | undefined): string | undefined {
  return path?.split("/").filter(Boolean).pop() ?? undefined;
}

// Generic "if this piece of referenced data is present, add a child node for it" helper - covers
// every satellite kind (layout, template, datasource, variant, child item, ...) through one code
// path instead of a bespoke if-block per kind, so adding a new one later is just another list
// entry. The index (not just kind) is part of the node id since some kinds - child items - can
// legitimately repeat multiple times under the same parent.
export function appendSatellites(nodes: cytoscape.ElementDefinition[], edges: cytoscape.ElementDefinition[], parentId: string, descriptors: SatelliteDescriptor[]): void {
  descriptors.forEach((descriptor, index) => {
    if (!descriptor.value) return;
    const nodeId = `${parentId}-${slugify(descriptor.kind)}-${index}`;
    nodes.push({
      data: {
        id: nodeId,
        ...(descriptor.compoundParent ? { parent: descriptor.compoundParent } : {}),
        label: descriptor.plainLabel ? descriptor.value : buildLabel(descriptor.kind, descriptor.value),
        link: descriptor.link ?? undefined,
        tooltip: buildTooltip(descriptor.value, undefined, descriptor.path ?? undefined),
      },
      classes: [kindClass(descriptor.category ?? descriptor.kind), descriptor.filterClass].filter(Boolean).join(" "),
    });
    edges.push({
      data: descriptor.reverse ? { id: `edge-${nodeId}`, source: nodeId, target: parentId } : { id: `edge-${nodeId}`, source: parentId, target: nodeId },
    });
  });
}

// Compound nodes: a real cytoscape feature (data.parent nests a node visually inside another),
// used here for Section -> its Fields specifically, rather than an edge - a section genuinely
// contains its fields, so no edge is drawn (the nesting itself conveys that). Returns the created
// id per descriptor (undefined where skipped) so a caller can attach further satellites to one of them.
export function appendCompoundChildren(nodes: cytoscape.ElementDefinition[], parentId: string, descriptors: SatelliteDescriptor[]): Array<string | undefined> {
  return descriptors.map((descriptor, index) => {
    if (!descriptor.value) return undefined;
    const nodeId = `${parentId}-${slugify(descriptor.kind)}-${index}`;
    nodes.push({
      data: {
        id: nodeId,
        parent: parentId,
        label: descriptor.plainLabel ? descriptor.value : buildLabel(descriptor.kind, descriptor.value),
        link: descriptor.link ?? undefined,
        tooltip: buildTooltip(descriptor.value, undefined, descriptor.path ?? undefined),
      },
      classes: [kindClass(descriptor.category ?? descriptor.kind), descriptor.filterClass].filter(Boolean).join(" "),
    });
    return nodeId;
  });
}

// POC visualization: a cytoscape graph in a <dialog> injected into the active Content Editor
// page - no new tab/page/build entry needed. Plain-clicking a node with a link calls
// harvestForLink and, if it resolves, re-roots this SAME dialog's graph at that item (no
// navigation, no reopening); ctrl/cmd-click opens it in a new tab instead.
export function openReferenceGraphModal(doc: Document, graph: ReferenceGraphResult, harvestForLink: (link: string) => Promise<ReferenceGraphResult | undefined>): void {
  doc.getElementById(REFERENCE_GRAPH.DIALOG_ID)?.remove();

  const dialog = doc.createElement("dialog");
  dialog.id = REFERENCE_GRAPH.DIALOG_ID;
  dialog.style.cssText = "width:90vw;height:85vh;padding:0;border:none;border-radius:4px;";

  // Hover/disabled states for the buttons below - a plain inline style can't express either, and
  // scoping the selector to the dialog's own id keeps it from leaking onto the host Sitecore page.
  const toolbarStyle = doc.createElement("style");

  toolbarStyle.textContent = `
    #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button {
      border: 1px solid #2f6fed;
      background: #eaf1fc;
      color: #203047;
      border-radius: 4px;
      padding: 5px 12px;
      font-size: 12px;
      font-family: sans-serif;
      cursor: pointer;
    }
    #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button:hover:not(:disabled) { background: #d7e4fb; }
    #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button:disabled { opacity: 0.5; cursor: default; }
    #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button--close { border-color: #d13f3f; background: #fbe9e9; }
    #${REFERENCE_GRAPH.DIALOG_ID} .fobles-reference-graph-button--close:hover { background: #f6d4d4; }
  `;

  const closeButton = createCloseButton(doc, dialog);

  // const toolbar = createToolbar(doc,renderGraph);
  const toolbar = doc.createElement("div");
  const toolbarRoot = createRoot(toolbar);

  // Persisted show/hide toggles for each satellite group - checked state (and the resulting
  // node visibility) survives across re-roots within this dialog's lifetime automatically, since
  // these checkboxes/their classes aren't recreated.

  const container = doc.createElement("div");
  container.style.cssText = "width:100%;height:100%;";

  dialog.append(toolbarStyle, closeButton, toolbar, container);
  doc.body.appendChild(dialog);
  activeReferenceGraphDialog = dialog;
  dialog.addEventListener("close", () => { toolbarRoot.unmount(); activeReferenceGraphDialog = undefined; dialog.remove(); });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.showModal();

  const initialElements = buildElements(graph);
  // Unconditional (not gated behind extensionLog's debug flag) - this is the enriched shape
  // (with each node's parent/compound nesting already resolved), not the raw harvested graph,
  // deliberately logged here so it can be inspected in devtools without flipping on debug mode.
  console.log("[Fobles] Reference Graph elements", initialElements);

  const cy = cytoscape({
    container,
    elements: initialElements,
    // dagre (layered/Sugiyama-style) grows the tree outward in clean ranks from the root,
    // minimizing edge crossings as part of the algorithm itself - breadthfirst (even circular)
    // can't guarantee that. The dropdown above lets the user try the organic alternatives too.
    layout: REFERENCE_GRAPH.LAYOUT_PRESETS[REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME].build(),
    // Default wheelSensitivity (1) feels like one scroll notch jumps too far - calmer here, with
    // bounds so the graph can't be zoomed out to invisible or in to meaningless.
    wheelSensitivity: 1.5,
    minZoom: 0.2,
    maxZoom: 3,
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "font-size": 10,
          color: "#203047",
          shape: "round-rectangle",
          "background-color": "#eaf1fc",
          "background-opacity": 1,
          "border-width": 1,
          "border-color": "#2f6fed",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
        },
      },
      {
        // Fixed, label-based sizing only makes sense for leaf nodes - a compound parent (a
        // Section, via its Fields' data.parent) needs to auto-size to fit its children instead,
        // which only happens when width/height aren't explicitly set on it at all.
        selector: "node:childless",
        style: {
          width: "label",
          height: "label",
          padding: "10px",
        },
      },
      {
        selector: `.${kindClass("structural")}`,
        style: {
          "font-size": 9,
          "background-color": REFERENCE_GRAPH.STRUCTURAL_COLOR,
          "background-opacity": 0.15,
          "border-color": REFERENCE_GRAPH.STRUCTURAL_COLOR,
        },
      },
      ...Object.entries(REFERENCE_GRAPH.KIND_COLORS).map(([kind, color]) => ({
        selector: `.${kindClass(kind)}`,
        style: {
          "background-color": color,
          "background-opacity": 0.15,
          "border-color": color,
        },
      })),
      {
        // The root item is the one node every graph always has - bigger/bolder/more saturated
        // than anything else so it still reads as "the root" no matter which layout algorithm
        // (and whichever node that algorithm happens to visually center) is active.
        selector: `.${kindClass(REFERENCE_GRAPH.NODE_KIND.ITEM)}`,
        style: {
          "font-size": 13,
          "font-weight": "bold",
          "border-width": 3,
          "background-opacity": 0.35,
          padding: "14px",
        },
      },
      {
        // :parent matches any node with children (here: Section nodes, via each Field's
        // data.parent) - deliberately doesn't repeat width/height from the childless rule above,
        // since specifying them at all would disable cytoscape's own auto-fit-to-children sizing.
        selector: ":parent",
        style: {
          shape: "round-rectangle",
          "background-opacity": 0.15,
          "border-style": "solid",
          "border-width": 1,
          "text-valign": "top",
          "text-halign": "center",
          padding: "16px",
        },
      },
      {
        selector: "edge",
        style: { "curve-style": "bezier", "target-arrow-shape": "triangle", width: 1 },
      },
    ],
  });

  let currentLayoutPresetName = REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME;
  const graphHistory: ReferenceGraphResult[] = [];
  // let currentGraph = graph;
  let currentFilters = DEFAULT_RENDERING_GRAPH_FILTERS_STATE;

  function renderToolbar(toolbarGraph: ReferenceGraphResult): void {
    toolbarRoot.render(
      <GraphToolbar
        graph={toolbarGraph}
        layoutPresetName={currentLayoutPresetName}
        onLayoutChange={(layoutPresetName) => {
          currentLayoutPresetName = layoutPresetName;
          cy.layout(REFERENCE_GRAPH.LAYOUT_PRESETS[layoutPresetName].build()).run();
          void setReferenceGraphLayout(layoutPresetName);
        }}
        canGoBack={graphHistory.length > 0}
        onBack={() => {
          const previousGraph = graphHistory.pop();
          if (previousGraph) renderGraph(previousGraph);
        }}
        filters={currentFilters}
        onFilterChange={(key, checked) => {
          currentFilters = { ...currentFilters, [key]: checked };
          const filterDefinition = REFERENCE_GRAPH.FILTER_DEFS.find((filter) => filter.key === key);
          if (filterDefinition) {
            cy.elements(`.${filterDefinition.className}`).style("display", checked ? "element" : "none");
          }

          cy.layout( REFERENCE_GRAPH.LAYOUT_PRESETS[currentLayoutPresetName].build(), ).run();

          void setReferenceGraphFilters(currentFilters);
          renderToolbar(currentGraph);
        }}
      />,
    );
  }
  renderToolbar(graph);

  void getReferenceGraphFilters().then((filters) => {
    currentFilters = filters;
    REFERENCE_GRAPH.FILTER_DEFS.forEach(({ key, className }) => {
      cy.elements(`.${className}`).style("display", currentFilters[key] ? "element" : "none");
    });
    renderToolbar(currentGraph);
  });

  // The root's own info is shown in the toolbar panel instead (see rootInfo/updateRootInfo
  // above), not repeated as a tooltip on its node. Tooltips themselves are created lazily per
  // node on first click (see the "tap" handler below), not pre-attached here.
  extensionLog.debug("Reference graph: modal opened", { nodeCount: cy.nodes().length });

  let currentGraph = graph;

  // Apply a previously-saved layout preference once it loads, without blocking the dialog's
  // initial (default-layout) render on the storage read.
  void getReferenceGraphLayoutName().then((layoutPresetName) => {
    if (!layoutPresetName || !(layoutPresetName in REFERENCE_GRAPH.LAYOUT_PRESETS) || layoutPresetName === currentLayoutPresetName) {
      return;
    }
    currentLayoutPresetName = layoutPresetName;
    cy.layout(REFERENCE_GRAPH.LAYOUT_PRESETS[layoutPresetName].build()).run();
    renderToolbar(currentGraph);
  });

  attachGraphEventHandlers(cy, container, harvestForLink, doc, graphHistory, () => currentGraph, renderGraph);

  function renderGraph(newGraph: ReferenceGraphResult): void {
    //  const graphHistory: ReferenceGraphResult[] = [];
    //  let currentGraph = graph;
    renderToolbar(newGraph);

    cy.elements().remove();
    const elements = buildElements(newGraph);
    console.log("[Fobles] Reference Graph elements", elements);
    cy.add(elements);
    hideActiveTooltip();
    REFERENCE_GRAPH.FILTER_DEFS.forEach(({ key, className }) => {
      cy.elements(`.${className}`).style("display", currentFilters[key] ? "element" : "none");
    });

    cy.layout(REFERENCE_GRAPH.LAYOUT_PRESETS[currentLayoutPresetName].build()).run();

    currentGraph = newGraph;
   
  }
}