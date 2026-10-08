import cytoscape from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
import cytoscapePopper from "cytoscape-popper";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { extensionLog } from "../../logger";
import type { RenderingGraphResult } from "./rendering-graph.types";

cytoscape.use(cytoscapeDagre);

const DIALOG_ID = "fobles-rendering-graph-dialog";
const PROGRESS_DIALOG_ID = "fobles-rendering-graph-progress-dialog";

// dialog.showModal() renders the dialog in the browser's top layer, above everything else in
// the document - a tippy popper appended to document.body would render behind it. Tracking the
// open dialog here lets the popper factory append into it instead, so tooltips stay visible.
let activeRenderingGraphDialog: HTMLElement | null = null;

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
  (doc.getElementById(PROGRESS_DIALOG_ID) as HTMLDialogElement | null)?.close();
}

type TooltipData = {
  name: string | null;
  guid: string | null;
  path: string | null;
  template: string | null;
};

// Prefixed onto every node's label (e.g. "CONTROL\nFobles Header") so it's clear at a glance
// what kind of thing a node represents, without needing to hover.
const NODE_KIND = {
  DEVICE: "Device",
  ITEM: "Item",
  CONTROL: "Control",
  DATASOURCE: "Datasource",
  VARIANT: "Variant",
  TEMPLATE: "Template",
  LAYOUT: "Layout",
} as const;

// Fixed structural wrapper nodes (the device + the two layout XML sources everything else is
// parsed from) rather than real Sitecore items, so they get plain labels, not a kind prefix.
const DEFAULT_DEVICE_NODE_ID = "fobles-rendering-graph-device-default";
const SHARED_LAYOUT_NODE_ID = "fobles-rendering-graph-shared-layout";
const FINAL_LAYOUT_NODE_ID = "fobles-rendering-graph-final-layout";

// Satellite nodes (datasource/variant/template/layout) get this class so they can be styled
// smaller/lighter than the main item/control nodes - see the "satellite" style selector below.
const SATELLITE_CLASS = "fobles-rendering-graph-satellite";

function buildLabel(kind: string, name: string): string {
  return `${kind.toUpperCase()}\n${name}`;
}

function buildTooltip(name: string | null, guid: string | null, path: string | null, template: string | null): TooltipData {
  return { name, guid, path, template };
}

type SatelliteDescriptor = {
  kind: string;
  value: string | null;
  link?: string | null;
};

// Generic "if this piece of referenced data is present, add a child node for it" helper - covers
// every satellite kind (layout, template, datasource, variant, ...) through one code path instead
// of a bespoke if-block per kind, so adding a new one later is just another list entry.
function appendSatellites(
  nodes: cytoscape.ElementDefinition[],
  edges: cytoscape.ElementDefinition[],
  parentId: string,
  descriptors: SatelliteDescriptor[],
): void {
  descriptors.forEach((descriptor) => {
    if (!descriptor.value) return;
    const nodeId = `${parentId}-${descriptor.kind.toLowerCase().replace(/\s+/g, "-")}`;
    nodes.push({
      data: {
        id: nodeId,
        label: buildLabel(descriptor.kind, descriptor.value),
        link: descriptor.link ?? null,
        tooltip: buildTooltip(descriptor.value, null, null, null),
      },
      classes: SATELLITE_CLASS,
    });
    edges.push({ data: { id: `edge-${nodeId}`, source: parentId, target: nodeId } });
  });
}

function buildElements(graph: RenderingGraphResult): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = [
    {
      data: {
        id: graph.itemId,
        label: buildLabel(NODE_KIND.ITEM, graph.itemName ?? graph.itemId),
        link: graph.itemLink,
        tooltip: buildTooltip(graph.itemName, graph.itemId, graph.itemPath, graph.itemTemplate),
      },
    },
    {
      data: {
        id: DEFAULT_DEVICE_NODE_ID,
        label: buildLabel(NODE_KIND.DEVICE, "Default"),
        link: null,
        tooltip: buildTooltip("Default device", null, null, null),
      },
    },
    {
      data: {
        id: SHARED_LAYOUT_NODE_ID,
        label: "Shared Layout",
        link: null,
        tooltip: buildTooltip("Shared Layout (Renderings field)", null, null, null),
      },
    },
    {
      data: {
        id: FINAL_LAYOUT_NODE_ID,
        label: "Final Layout",
        link: null,
        tooltip: buildTooltip("Final Layout (Final renderings field)", null, null, null),
      },
    },
  ];
  const edges: cytoscape.ElementDefinition[] = [
    { data: { id: "edge-device", source: graph.itemId, target: DEFAULT_DEVICE_NODE_ID } },
    { data: { id: "edge-shared-layout", source: DEFAULT_DEVICE_NODE_ID, target: SHARED_LAYOUT_NODE_ID } },
    { data: { id: "edge-final-layout", source: DEFAULT_DEVICE_NODE_ID, target: FINAL_LAYOUT_NODE_ID } },
  ];

  appendSatellites(nodes, edges, SHARED_LAYOUT_NODE_ID, [
    { kind: NODE_KIND.LAYOUT, value: graph.sharedLayoutName, link: graph.sharedLayoutLink },
  ]);
  appendSatellites(nodes, edges, graph.itemId, [
    { kind: NODE_KIND.TEMPLATE, value: graph.itemTemplate, link: graph.itemTemplateLink },
  ]);

  graph.controls.forEach((control, index) => {
    const controlId = control.renderingId || control.uid || `control-${index}`;
    nodes.push({
      data: {
        id: controlId,
        label: buildLabel(NODE_KIND.CONTROL, control.name ?? control.renderingId),
        link: control.link,
        tooltip: buildTooltip(control.name, control.renderingId, control.path, control.template),
      },
    });
    edges.push({ data: { id: `edge-${controlId}`, source: FINAL_LAYOUT_NODE_ID, target: controlId } });

    appendSatellites(nodes, edges, controlId, [
      { kind: NODE_KIND.DATASOURCE, value: control.datasource, link: control.datasourceLink },
      { kind: NODE_KIND.VARIANT, value: control.parameters.Variant ?? null, link: null },
    ]);
  });

  return [...nodes, ...edges];
}

function buildTooltipContent(data: TooltipData): HTMLElement {
  const container = document.createElement("div");
  container.style.cssText =
    "background:#203047;color:#fff;padding:8px 10px;border-radius:4px;font:12px/1.6 sans-serif;max-width:320px;";

  const rows: Array<[string, string | null]> = [
    ["Name", data.name],
    ["GUID", data.guid],
    ["Path", data.path],
    ["Template", data.template],
  ];
  rows
    .filter((row): row is [string, string] => row[1] !== null)
    .forEach(([label, value]) => {
      const row = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      row.append(strong, document.createTextNode(value));
      container.appendChild(row);
    });

  return container;
}

// Lazily creates one tippy instance per node on first hover, reused for every hover after that.
function attachTooltip(node: cytoscape.NodeSingular): void {
  let tip: TippyInstance | null = null;
  node.on("mouseover", () => {
    extensionLog.debug("Rendering graph: node mouseover", { id: node.id() });
    tip ??= node.popper({ content: () => buildTooltipContent(node.data("tooltip") as TooltipData) }) as TippyInstance;
    tip.show();
  });
  node.on("mouseout", () => {
    extensionLog.debug("Rendering graph: node mouseout", { id: node.id() });
    tip?.hide();
  });
  node.on("remove", () => tip?.destroy());
}

// POC visualization: a cytoscape graph in a <dialog> injected into the active Content Editor
// page - no new tab/page/build entry needed. Tapping a node opens its fo link in a new tab.
export function openRenderingGraphModal(doc: Document, graph: RenderingGraphResult): void {
  doc.getElementById(DIALOG_ID)?.remove();

  const dialog = doc.createElement("dialog");
  dialog.id = DIALOG_ID;
  dialog.style.cssText = "width:90vw;height:85vh;padding:0;border:none;border-radius:4px;";

  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.style.cssText = "position:absolute;top:8px;right:8px;z-index:1;";
  closeButton.addEventListener("click", () => dialog.close());

  const container = doc.createElement("div");
  container.style.cssText = "width:100%;height:100%;";

  dialog.append(closeButton, container);
  doc.body.appendChild(dialog);
  activeRenderingGraphDialog = dialog;
  dialog.addEventListener("close", () => {
    activeRenderingGraphDialog = null;
    dialog.remove();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.showModal();

  // cytoscape-dagre's own options type isn't merged into cytoscape core's LayoutOptions union
  // (unlike cytoscape-popper's SingularData merge above) - cast is just filling that typing gap.
  const dagreLayout: cytoscapeDagre.DagreLayoutOptions = {
    name: "dagre",
    rankDir: "TB",
    nodeSep: 30,
    rankSep: 60,
    padding: 20,
  };

  const cy = cytoscape({
    container,
    elements: buildElements(graph),
    // dagre (layered/Sugiyama-style) grows the tree outward in clean ranks from the root,
    // minimizing edge crossings as part of the algorithm itself - breadthfirst (even circular)
    // can't guarantee that.
    layout: dagreLayout as unknown as cytoscape.LayoutOptions,
    // Default wheelSensitivity (1) feels like one scroll notch jumps too far - calmer here, with
    // bounds so the graph can't be zoomed out to invisible or in to meaningless.
    wheelSensitivity: 0.2,
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
          width: "label",
          height: "label",
          padding: "10px",
        },
      },
      {
        selector: `.${SATELLITE_CLASS}`,
        style: {
          "font-size": 8,
          "background-color": "#f5f8fc",
          "border-color": "#9fb6d9",
          "border-style": "dashed",
        },
      },
      {
        selector: "edge",
        style: { "curve-style": "bezier", "target-arrow-shape": "triangle", width: 1 },
      },
    ],
  });

  cy.nodes().forEach(attachTooltip);
  extensionLog.debug("Rendering graph: modal opened", { nodeCount: cy.nodes().length });

  cy.on("tap", "node", (event) => {
    const link = event.target.data("link");
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  });
}
