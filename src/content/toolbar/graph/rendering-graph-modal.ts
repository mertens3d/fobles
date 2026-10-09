import { buildElements, type SatelliteDescriptor } from "./graph.types";
import cytoscape from "cytoscape";
import cytoscapeCoseBilkent from "cytoscape-cose-bilkent";
import cytoscapeDagre from "cytoscape-dagre";
import cytoscapeFcose from "cytoscape-fcose";
import cytoscapePopper from "cytoscape-popper";
import tippy from "tippy.js";
import { extensionLog } from "../../logger";
import {
  getRenderingGraphFilters,
  getRenderingGraphLayout,
  setRenderingGraphFilters,
  setRenderingGraphLayout,
} from "../../../shared/rendering-graph-settings";
import type { ReferenceGraphResult } from "./rendering-graph.types";
import { DEFAULT_LAYOUT_PRESET, DIALOG_ID, FILTER_DEFS, GRAPHCONST, LAYOUT_PRESETS, PROGRESS_DIALOG_ID, PROGRESS_MESSAGE_ID, STRUCTURAL_COLOR } from "./graph.const";
import { attachGraphEventHandlers, hideActiveTooltip } from "./event-handlers";
import { buildTooltip } from "./graph-tooltip";

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeFcose);

// dialog.showModal() renders the dialog in the browser's top layer, above everything else in
// the document - a tippy popper appended to document.body would render behind it. Tracking the
// open dialog here lets the popper factory append into it instead, so tooltips stay visible.
let activeRenderingGraphDialog: HTMLElement | undefined = undefined;

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
      appendTo: () => activeRenderingGraphDialog ?? document.body,
    }),
  ),
);
extensionLog.debug("Rendering graph: cytoscape-popper/tippy bridge registered");


// Shown immediately on click (and again on every reload the toggle-enable/restore sequence
// triggers), since harvesting involves a fetch per rendering plus possibly a couple of page
// reloads - a singleton dialog so re-showing it on each reload just replaces the last one.
export function openRenderingGraphProgressModal(doc: Document, onCancel: () => void): void {
  closeRenderingGraphProgressModal(doc);

  const dialog = doc.createElement("dialog");
  dialog.id = PROGRESS_DIALOG_ID;
  dialog.style.cssText =
    "padding:24px 32px;border:none;border-radius:4px;text-align:center;font-family:sans-serif;";

  const message = doc.createElement("p");
  message.id = PROGRESS_MESSAGE_ID;
  message.textContent = "Researching rendering graph...";
  message.style.cssText = "margin:0 0 16px;";

  const cancelButton = doc.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", onCancel);

  dialog.append(message, cancelButton);
  doc.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) onCancel();
  });
  dialog.showModal();
}

export function closeRenderingGraphProgressModal(doc: Document): void {
  (doc.getElementById(PROGRESS_DIALOG_ID) as HTMLDialogElement | undefined)?.close();
}

// Not a real percentage of actual work remaining (no good way to know that upfront) - just a
// ticking counter so the user can see something is genuinely progressing, not hung.
export function updateRenderingGraphProgressModal(doc: Document, completed: number, total: number): void {
  const message = doc.getElementById(PROGRESS_MESSAGE_ID);
  if (message) message.textContent = `Researching rendering graph... (${completed}/${total})`;
}

export function buildLabel(kind: string, name: string): string {
  return `${name}\n[${kind.toLowerCase()}]`;
}

// Several referenced-item fields arrive as a full Sitecore path, not just a name - shown
// shortened on the node itself, with the full path still available via its tooltip.
export function lastPathSegment(path: string | undefined): string | undefined {
  return path?.split("/").filter(Boolean).pop() ?? undefined;
}

// Dynamic placeholders key each instance as "basekey-{renderingOrDatasourceGuid}-index" (e.g.
// "vert-column-1-{1F4F7280-6873-44F8-8A78-20EA0EF3D157}-0") so Sitecore can tell repeated
// instances of the same placeholder apart - stripped here so every instance of "vert-column-1"
// groups together instead of each becoming its own one-off placeholder group.
export function stripDynamicPlaceholderSuffix(segment: string): string {
  return segment.replace(/-\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}-\d+$/i, "");
}

// Node ids only need to be unique strings - not real selectors - but keeping them readable helps
// when debugging via the devtools elements panel.
export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function kindClass(kind: string): string {
  return `fobles-rendering-graph-kind-${slugify(kind)}`;
}

// Generic "if this piece of referenced data is present, add a child node for it" helper - covers
// every satellite kind (layout, template, datasource, variant, child item, ...) through one code
// path instead of a bespoke if-block per kind, so adding a new one later is just another list
// entry. The index (not just kind) is part of the node id since some kinds - child items - can
// legitimately repeat multiple times under the same parent.
export function appendSatellites(
  nodes: cytoscape.ElementDefinition[],
  edges: cytoscape.ElementDefinition[],
  parentId: string,
  descriptors: SatelliteDescriptor[],
): void {
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
      data: descriptor.reverse
        ? { id: `edge-${nodeId}`, source: nodeId, target: parentId }
        : { id: `edge-${nodeId}`, source: parentId, target: nodeId },
    });
  });
}

// Compound nodes: a real cytoscape feature (data.parent nests a node visually inside another),
// used here for Section -> its Fields specifically, rather than an edge - a section genuinely
// contains its fields, so no edge is drawn (the nesting itself conveys that). Returns the created
// id per descriptor (undefined where skipped) so a caller can attach further satellites to one of them.
export function appendCompoundChildren(
  nodes: cytoscape.ElementDefinition[],
  parentId: string,
  descriptors: SatelliteDescriptor[],
): Array<string | undefined> {
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
export function openRenderingGraphModal(
  doc: Document,
  graph: ReferenceGraphResult,
  harvestForLink: (link: string) => Promise<ReferenceGraphResult | undefined>,
): void {
  doc.getElementById(DIALOG_ID)?.remove();

  const dialog = doc.createElement("dialog");
  dialog.id = DIALOG_ID;
  dialog.style.cssText = "width:90vw;height:85vh;padding:0;border:none;border-radius:4px;";

  // Hover/disabled states for the buttons below - a plain inline style can't express either, and
  // scoping the selector to the dialog's own id keeps it from leaking onto the host Sitecore page.
  const toolbarStyle = doc.createElement("style");
  toolbarStyle.textContent = `
    #${DIALOG_ID} .fobles-rendering-graph-button {
      border: 1px solid #2f6fed;
      background: #eaf1fc;
      color: #203047;
      border-radius: 4px;
      padding: 5px 12px;
      font-size: 12px;
      font-family: sans-serif;
      cursor: pointer;
    }
    #${DIALOG_ID} .fobles-rendering-graph-button:hover:not(:disabled) { background: #d7e4fb; }
    #${DIALOG_ID} .fobles-rendering-graph-button:disabled { opacity: 0.5; cursor: default; }
    #${DIALOG_ID} .fobles-rendering-graph-button--close { border-color: #d13f3f; background: #fbe9e9; }
    #${DIALOG_ID} .fobles-rendering-graph-button--close:hover { background: #f6d4d4; }
  `;

  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.className = "fobles-rendering-graph-button fobles-rendering-graph-button--close";
  closeButton.style.cssText = "position:absolute;top:10px;right:10px;z-index:1;";
  closeButton.addEventListener("click", () => dialog.close());

  // One panel holding the layout picker + Back (top row) and the filter checkboxes (second row),
  // instead of several separately-positioned/styled floating controls.
  const toolbar = doc.createElement("div");
  toolbar.style.cssText =
    "position:absolute;top:10px;left:10px;z-index:1;display:flex;flex-direction:column;gap:8px;background:rgba(255,255,255,0.92);padding:8px 10px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-family:sans-serif;";

  const toolbarTopRow = doc.createElement("div");
  toolbarTopRow.style.cssText = "display:flex;flex-direction:column;gap:6px;";

  const layoutSelect = doc.createElement("select");
  layoutSelect.style.cssText =
    "width:170px;font-size:12px;padding:4px 6px;border-radius:4px;border:1px solid #2f6fed;color:#203047;";
  Object.entries(LAYOUT_PRESETS).forEach(([value, preset]) => {
    const option = doc.createElement("option");
    option.value = value;
    option.textContent = preset.label;
    option.selected = value === DEFAULT_LAYOUT_PRESET;
    layoutSelect.appendChild(option);
  });

  // History of every root this dialog has shown so far (oldest first) - Back pops the most
  // recent one and re-renders it, without re-fetching anything already harvested this session.
  const graphHistory: ReferenceGraphResult[] = [];
  const backButton = doc.createElement("button");
  backButton.type = "button";
  backButton.textContent = "< Back";
  backButton.disabled = true;
  backButton.className = "fobles-rendering-graph-button";
  // Under the dropdown (not beside it) and the same width, so the whole panel stays narrow.
  backButton.style.cssText = "width:170px;";

  toolbarTopRow.append(layoutSelect, backButton);

  // The current root's own Name/GUID/Path, shown here instead of as a tooltip on its node - it's
  // the one piece of info visible without clicking anything.
  const rootInfo = doc.createElement("div");
  rootInfo.style.cssText = "font-size:11px;color:#203047;line-height:1.5;max-width:220px;word-break:break-word;";
  function updateRootInfo(rootGraph: ReferenceGraphResult): void {
    rootInfo.replaceChildren();
    const rows: Array<[string, string | undefined]> = [
      ["Name", rootGraph.itemName ?? undefined],
      ["GUID", rootGraph.itemId],
      ["Path", rootGraph.itemPath ?? undefined],
    ];
    rows
      .filter((row): row is [string, string] => row[1] !== undefined)
      .forEach(([label, value]) => {
        const row = doc.createElement("div");
        const strong = doc.createElement("strong");
        strong.textContent = `${label}: `;
        row.append(strong, doc.createTextNode(value));
        rootInfo.appendChild(row);
      });
  }
  updateRootInfo(graph);

  // Persisted show/hide toggles for each satellite group - checked state (and the resulting
  // node visibility) survives across re-roots within this dialog's lifetime automatically, since
  // these checkboxes/their classes aren't recreated.
  const filterRow = doc.createElement("div");
  filterRow.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:11px;";
  const filterCheckboxes = FILTER_DEFS.map((filterDef) => {
    const label = doc.createElement("label");
    label.style.cssText = "display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:#203047;";
    const checkbox = doc.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    label.append(checkbox, doc.createTextNode(filterDef.label));
    filterRow.appendChild(label);
    return { ...filterDef, checkbox };
  });

  // Explains the click/double-click/ctrl-click split below, since none of it is otherwise
  // discoverable from the graph itself.
  const interactionLegend = doc.createElement("div");
  interactionLegend.style.cssText =
    "font-size:10px;color:#5a6b80;line-height:1.5;border-top:1px solid #d7e0ea;padding-top:6px;";
  interactionLegend.innerHTML =
    "Click: tooltip<br>Double-click: go to node<br>Ctrl/Cmd+click: open in new tab";

  toolbar.append(toolbarTopRow, rootInfo, filterRow, interactionLegend);

  const container = doc.createElement("div");
  container.style.cssText = "width:100%;height:100%;";

  dialog.append(toolbarStyle, closeButton, toolbar, container);
  doc.body.appendChild(dialog);
  activeRenderingGraphDialog = dialog;
  dialog.addEventListener("close", () => {
    activeRenderingGraphDialog = undefined;
    dialog.remove();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.showModal();

  const initialElements = buildElements(graph);
  // Unconditional (not gated behind extensionLog's debug flag) - this is the enriched shape
  // (with each node's parent/compound nesting already resolved), not the raw harvested graph,
  // deliberately logged here so it can be inspected in devtools without flipping on debug mode.
  console.log("[Fobles] Rendering graph elements", initialElements);

  const cy = cytoscape({
    container,
    elements: initialElements,
    // dagre (layered/Sugiyama-style) grows the tree outward in clean ranks from the root,
    // minimizing edge crossings as part of the algorithm itself - breadthfirst (even circular)
    // can't guarantee that. The dropdown above lets the user try the organic alternatives too.
    layout: LAYOUT_PRESETS[DEFAULT_LAYOUT_PRESET].build(),
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
          "background-color": STRUCTURAL_COLOR,
          "background-opacity": 0.15,
          "border-color": STRUCTURAL_COLOR,
        },
      },
      ...Object.entries(GRAPHCONST.KIND_COLORS).map(([kind, color]) => ({
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
        selector: `.${kindClass(GRAPHCONST.NODE_KIND.ITEM)}`,
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

  // The root's own info is shown in the toolbar panel instead (see rootInfo/updateRootInfo
  // above), not repeated as a tooltip on its node. Tooltips themselves are created lazily per
  // node on first click (see the "tap" handler below), not pre-attached here.
  extensionLog.debug("Rendering graph: modal opened", { nodeCount: cy.nodes().length });

  function applyFilters(): void {
    filterCheckboxes.forEach(({ className, checkbox }) => {
      cy.elements(`.${className}`).style("display", checkbox.checked ? "element" : "none");
    });
  }
  applyFilters();

  filterCheckboxes.forEach(({ key, checkbox }) => {
    checkbox.addEventListener("change", () => {
      applyFilters();
      cy.layout(LAYOUT_PRESETS[layoutSelect.value].build()).run();
      void getRenderingGraphFilters().then((filters) => {
        void setRenderingGraphFilters({ ...filters, [key]: checkbox.checked });
      });
    });
  });

  // Apply previously-saved filter checkboxes once they load, same non-blocking pattern as the
  // layout preference below.
  void getRenderingGraphFilters().then((filters) => {
    filterCheckboxes.forEach(({ key, checkbox }) => {
      checkbox.checked = filters[key];
    });
    applyFilters();
  });

  let currentGraph = graph;
  function renderGraph(newGraph: ReferenceGraphResult): void {
    cy.elements().remove();
    const elements = buildElements(newGraph);
    console.log("[Fobles] Rendering graph elements", elements);
    cy.add(elements);
    hideActiveTooltip();
    applyFilters();
    cy.layout(LAYOUT_PRESETS[layoutSelect.value].build()).run();
    currentGraph = newGraph;
    updateRootInfo(newGraph);
    backButton.disabled = graphHistory.length === 0;
  }

  backButton.addEventListener("click", () => {
    const previous = graphHistory.pop();
    if (!previous) return;
    renderGraph(previous);
  });

  // Apply a previously-saved layout preference once it loads, without blocking the dialog's
  // initial (default-layout) render on the storage read.
  void getRenderingGraphLayout().then((savedLayout) => {
    if (!savedLayout || !(savedLayout in LAYOUT_PRESETS) || savedLayout === layoutSelect.value) return;
    layoutSelect.value = savedLayout;
    cy.layout(LAYOUT_PRESETS[savedLayout].build()).run();
  });

  layoutSelect.addEventListener("change", () => {
    const preset = LAYOUT_PRESETS[layoutSelect.value];
    extensionLog.debug("Rendering graph: layout changed", { layout: layoutSelect.value });
    cy.layout(preset.build()).run();
    void setRenderingGraphLayout(layoutSelect.value);
  });

  attachGraphEventHandlers(cy, container, harvestForLink, doc, graphHistory, currentGraph, renderGraph);

  
}
