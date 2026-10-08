import cytoscape from "cytoscape";
import cytoscapeCoseBilkent from "cytoscape-cose-bilkent";
import cytoscapeDagre from "cytoscape-dagre";
import cytoscapeFcose from "cytoscape-fcose";
import cytoscapePopper from "cytoscape-popper";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../augmentor/helper";
import {
  getRenderingGraphFilters,
  getRenderingGraphLayout,
  setRenderingGraphFilters,
  setRenderingGraphLayout,
  type RenderingGraphFilters,
} from "../../../shared/rendering-graph-settings";
import type { RenderingGraphResult } from "./rendering-graph.types";

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeFcose);

// None of these three extensions' option types are merged into cytoscape core's LayoutOptions
// union (unlike cytoscape-popper's SingularData merge below) - each factory below casts its own
// options object at the point of use, which is just filling that typing gap, not a real risk.
const LAYOUT_PRESETS: Record<string, { label: string; build: () => cytoscape.LayoutOptions }> = {
  dagre: {
    label: "Dagre (tree)",
    build: () =>
      ({ name: "dagre", rankDir: "TB", nodeSep: 30, rankSep: 60, padding: 20 }) as unknown as cytoscape.LayoutOptions,
  },
  "cose-bilkent": {
    label: "CoSE Bilkent (organic)",
    build: () => ({ name: "cose-bilkent", padding: 20 }) as unknown as cytoscape.LayoutOptions,
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
};
const DEFAULT_LAYOUT_PRESET = "dagre";

// Toggleable node groups - each maps to a cytoscape class applied in buildElements, shown/hidden
// via style("display", ...) rather than rebuilding the graph. Hiding a node also hides any edges
// attached to it (cytoscape's own behavior), so no edge bookkeeping is needed here.
const FILTER_CLASS = {
  parent: "fobles-rendering-graph-filter-parent",
  children: "fobles-rendering-graph-filter-children",
  layout: "fobles-rendering-graph-filter-layout",
  referrers: "fobles-rendering-graph-filter-referrers",
  sections: "fobles-rendering-graph-filter-sections",
  template: "fobles-rendering-graph-filter-template",
} as const satisfies Record<keyof RenderingGraphFilters, string>;

const FILTER_DEFS: ReadonlyArray<{ key: keyof RenderingGraphFilters; label: string; className: string }> = [
  { key: "parent", label: "Parent", className: FILTER_CLASS.parent },
  { key: "children", label: "Children", className: FILTER_CLASS.children },
  { key: "layout", label: "Layout", className: FILTER_CLASS.layout },
  { key: "referrers", label: "Referrers", className: FILTER_CLASS.referrers },
  { key: "sections", label: "Sections", className: FILTER_CLASS.sections },
  { key: "template", label: "Template", className: FILTER_CLASS.template },
];

const DIALOG_ID = "fobles-rendering-graph-dialog";
const PROGRESS_DIALOG_ID = "fobles-rendering-graph-progress-dialog";
const PROGRESS_MESSAGE_ID = "fobles-rendering-graph-progress-message";

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
  (doc.getElementById(PROGRESS_DIALOG_ID) as HTMLDialogElement | null)?.close();
}

// Not a real percentage of actual work remaining (no good way to know that upfront) - just a
// ticking counter so the user can see something is genuinely progressing, not hung.
export function updateRenderingGraphProgressModal(doc: Document, completed: number, total: number): void {
  const message = doc.getElementById(PROGRESS_MESSAGE_ID);
  if (message) message.textContent = `Researching rendering graph... (${completed}/${total})`;
}

type TooltipData = {
  name: string | null;
  guid: string | null;
  path: string | null;
  placeholder: string | null;
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
  SECTION: "Section",
  PARENT: "Parent",
  CHILD: "Child",
  REFERRER: "Referrer",
  // Not a real label prefix (each field keeps its own field name as its label) - just the color
  // category every section field node shares, since there's no fixed/finite set of field names.
  FIELD: "Field",
} as const;

// One distinct color per kind instead of the old flat "dashed = satellite" look - a structural
// (non-identity) container cue, like the Section compound box's dashed border below, still
// layers on top of this independently.
const KIND_COLORS: Record<string, string> = {
  [NODE_KIND.ITEM]: "#2f6fed",
  [NODE_KIND.DEVICE]: "#5a6b80",
  [NODE_KIND.CONTROL]: "#1f9d55",
  [NODE_KIND.DATASOURCE]: "#c9820f",
  [NODE_KIND.VARIANT]: "#8a3fd6",
  [NODE_KIND.TEMPLATE]: "#0f9aa0",
  [NODE_KIND.LAYOUT]: "#9a5b1f",
  [NODE_KIND.SECTION]: "#555566",
  [NODE_KIND.PARENT]: "#b8860b",
  [NODE_KIND.CHILD]: "#d1428a",
  [NODE_KIND.REFERRER]: "#d13f3f",
  [NODE_KIND.FIELD]: "#7a7a7a",
};
const STRUCTURAL_COLOR = "#8a97a8"; // Device/Shared Layout/Final Layout wrapper nodes

// Fixed structural wrapper nodes (the device + the two layout XML sources everything else is
// parsed from) rather than real Sitecore items, so they get plain labels, not a kind prefix.
const DEFAULT_DEVICE_NODE_ID = "fobles-rendering-graph-device-default";
const SHARED_LAYOUT_NODE_ID = "fobles-rendering-graph-shared-layout";
const FINAL_LAYOUT_NODE_ID = "fobles-rendering-graph-final-layout";
// The one compound box everything above lives inside - its own self-contained subgraph (same
// internal edges as before), with a single edge back to the root item crossing the box itself.
const LAYOUT_BOX_NODE_ID = "fobles-rendering-graph-layout-box";

function buildLabel(kind: string, name: string): string {
  return `${name}\n[${kind.toLowerCase()}]`;
}

// Several referenced-item fields arrive as a full Sitecore path, not just a name - shown
// shortened on the node itself, with the full path still available via its tooltip.
function lastPathSegment(path: string | null): string | null {
  return path?.split("/").filter(Boolean).pop() ?? null;
}

// Dynamic placeholders key each instance as "basekey-{renderingOrDatasourceGuid}-index" (e.g.
// "vert-column-1-{1F4F7280-6873-44F8-8A78-20EA0EF3D157}-0") so Sitecore can tell repeated
// instances of the same placeholder apart - stripped here so every instance of "vert-column-1"
// groups together instead of each becoming its own one-off placeholder group.
function stripDynamicPlaceholderSuffix(segment: string): string {
  return segment.replace(/-\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}-\d+$/i, "");
}

// Node ids only need to be unique strings - not real selectors - but keeping them readable helps
// when debugging via the devtools elements panel.
function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function kindClass(kind: string): string {
  return `fobles-rendering-graph-kind-${slugify(kind)}`;
}

function buildTooltip(
  name: string | null,
  guid: string | null,
  path: string | null,
  placeholder: string | null = null,
): TooltipData {
  return { name, guid, path, placeholder };
}

type SatelliteDescriptor = {
  kind: string;
  value: string | null;
  link?: string | null;
  // Defaults to `kind` - set explicitly when `kind` is really a dynamic label (section field
  // names) rather than a fixed category, so coloring still falls into one shared bucket.
  category?: string;
  // Referrer -> this item is the real-world direction (a referrer points at this item), the
  // opposite of every other satellite (this item -> its template/datasource/child/...).
  reverse?: boolean;
  // One of FILTER_DEFS' classes - lets the Parent/Children/Layout/Referrers/Sections checkboxes
  // show/hide this node (and transitively its edges) without rebuilding the graph.
  filterClass?: string;
  // Full path, shown only in the tooltip - `value` stays short (e.g. a name) for the node label.
  path?: string | null;
  // Visually nests this node inside a compound box (e.g. the Layout super-compound) on top of
  // its normal edge - nesting and edges are independent in cytoscape, so both can apply at once.
  compoundParent?: string;
  // Skips the "[kind]" suffix buildLabel normally adds - for kinds whose container already makes
  // that implicit (e.g. a Child inside the "Children" box), same as Control nodes do already.
  plainLabel?: boolean;
};

// Generic "if this piece of referenced data is present, add a child node for it" helper - covers
// every satellite kind (layout, template, datasource, variant, child item, ...) through one code
// path instead of a bespoke if-block per kind, so adding a new one later is just another list
// entry. The index (not just kind) is part of the node id since some kinds - child items - can
// legitimately repeat multiple times under the same parent.
function appendSatellites(
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
        link: descriptor.link ?? null,
        tooltip: buildTooltip(descriptor.value, null, descriptor.path ?? null),
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
// id per descriptor (null where skipped) so a caller can attach further satellites to one of them.
function appendCompoundChildren(
  nodes: cytoscape.ElementDefinition[],
  parentId: string,
  descriptors: SatelliteDescriptor[],
): Array<string | null> {
  return descriptors.map((descriptor, index) => {
    if (!descriptor.value) return null;
    const nodeId = `${parentId}-${slugify(descriptor.kind)}-${index}`;
    nodes.push({
      data: {
        id: nodeId,
        parent: parentId,
        label: descriptor.plainLabel ? descriptor.value : buildLabel(descriptor.kind, descriptor.value),
        link: descriptor.link ?? null,
        tooltip: buildTooltip(descriptor.value, null, descriptor.path ?? null),
      },
      classes: [kindClass(descriptor.category ?? descriptor.kind), descriptor.filterClass].filter(Boolean).join(" "),
    });
    return nodeId;
  });
}

function buildElements(graph: RenderingGraphResult): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = [
    {
      data: {
        id: graph.itemId,
        label: buildLabel(NODE_KIND.ITEM, graph.itemName ?? graph.itemId),
        link: graph.itemLink,
        tooltip: buildTooltip(graph.itemName, graph.itemId, graph.itemPath),
      },
      classes: kindClass(NODE_KIND.ITEM),
    },
  ];
  const edges: cytoscape.ElementDefinition[] = [];

  // The item itself is the only guaranteed node - everything else (device/layout, controls,
  // template, parent, children, sections) only gets added when there's actual data for it.
  const hasLayoutData = graph.controls.length > 0 || Boolean(graph.sharedLayoutName);
  if (hasLayoutData) {
    nodes.push(
      {
        data: {
          id: LAYOUT_BOX_NODE_ID,
          label: "Layout",
          link: null,
          tooltip: buildTooltip("Layout (device/renderings/datasources)", null, null),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: DEFAULT_DEVICE_NODE_ID,
          parent: LAYOUT_BOX_NODE_ID,
          label: buildLabel(NODE_KIND.DEVICE, "Default"),
          link: null,
          tooltip: buildTooltip("Default device", null, null),
        },
        classes: `${kindClass(NODE_KIND.DEVICE)} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: SHARED_LAYOUT_NODE_ID,
          parent: LAYOUT_BOX_NODE_ID,
          label: "Shared Layout",
          link: null,
          tooltip: buildTooltip("Shared Layout (Renderings field)", null, null),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: FINAL_LAYOUT_NODE_ID,
          parent: LAYOUT_BOX_NODE_ID,
          label: "Final Layout",
          link: null,
          tooltip: buildTooltip("Final Layout (Final renderings field)", null, null),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
    );
    edges.push(
      { data: { id: "edge-layout", source: graph.itemId, target: LAYOUT_BOX_NODE_ID } },
      { data: { id: "edge-shared-layout", source: DEFAULT_DEVICE_NODE_ID, target: SHARED_LAYOUT_NODE_ID } },
      { data: { id: "edge-final-layout", source: DEFAULT_DEVICE_NODE_ID, target: FINAL_LAYOUT_NODE_ID } },
    );

    appendCompoundChildren(nodes, SHARED_LAYOUT_NODE_ID, [
      {
        kind: NODE_KIND.LAYOUT,
        value: graph.sharedLayoutName,
        link: graph.sharedLayoutLink,
        path: graph.sharedLayoutPath,
        filterClass: FILTER_CLASS.layout,
      },
    ]);
  }

  appendSatellites(nodes, edges, graph.itemId, [
    {
      kind: NODE_KIND.TEMPLATE,
      value: lastPathSegment(graph.itemTemplate) ?? graph.itemTemplate,
      link: graph.itemTemplateLink,
      path: graph.itemTemplate,
      filterClass: FILTER_CLASS.template,
    },
    {
      kind: NODE_KIND.PARENT,
      value: graph.parentName,
      link: graph.parentLink,
      path: graph.parentPath,
      filterClass: FILTER_CLASS.parent,
    },
  ]);

  // One compound "Children" box instead of each child spraying its own edge off the item -
  // same nesting cytoscape feature Section -> Fields already uses below.
  if (graph.childItems.length > 0) {
    const childrenId = `${graph.itemId}-children`;
    nodes.push({
      data: {
        id: childrenId,
        label: "Children",
        link: null,
        tooltip: buildTooltip(`${graph.childItems.length} item(s)`, null, null),
      },
      classes: `${kindClass("structural")} ${FILTER_CLASS.children}`,
    });
    edges.push({ data: { id: "edge-children", source: graph.itemId, target: childrenId } });

    appendCompoundChildren(
      nodes,
      childrenId,
      graph.childItems.map((child) => ({
        kind: NODE_KIND.CHILD,
        value: child.name,
        link: child.link,
        filterClass: FILTER_CLASS.children,
        plainLabel: true,
      })),
    );
  }

  // Same treatment for referrers - one "Referrers" box instead of each one spraying its own
  // edge in. The group's edge keeps the original reverse direction (referrers -> item).
  if (graph.referrers.length > 0) {
    const referrersId = `${graph.itemId}-referrers`;
    nodes.push({
      data: {
        id: referrersId,
        label: "Referrers",
        link: null,
        tooltip: buildTooltip(`${graph.referrers.length} item(s)`, null, null),
      },
      classes: `${kindClass("structural")} ${FILTER_CLASS.referrers}`,
    });
    edges.push({ data: { id: "edge-referrers", source: referrersId, target: graph.itemId } });

    appendCompoundChildren(
      nodes,
      referrersId,
      graph.referrers.map((referrer) => ({
        kind: NODE_KIND.REFERRER,
        value: referrer.name,
        link: referrer.link,
        path: referrer.path,
        filterClass: FILTER_CLASS.referrers,
        plainLabel: true,
      })),
    );
  }

  // Placeholder keys are themselves paths (e.g. "main/vert-column-1" is a nested placeholder
  // inside "main") - so groups nest the same way: "main/vert-column-1" is a compound child of
  // "main", not its sibling. A Map keyed by the normalized full path dedupes/links ancestors
  // regardless of which order controls are visited in; ensurePlaceholderGroup recursively
  // creates any ancestor group that doesn't have its own controls yet (just a pass-through box).
  type PlaceholderGroup = {
    id: string;
    label: string;
    parentId: string;
    controls: Array<{ control: (typeof graph.controls)[number]; index: number }>;
  };
  const placeholderGroups = new Map<string, PlaceholderGroup>();
  function ensurePlaceholderGroup(rawPath: string): PlaceholderGroup {
    const segments = rawPath.split("/").filter(Boolean).map(stripDynamicPlaceholderSuffix);
    const fullPath = segments.length > 0 ? segments.join("/") : rawPath;
    const existing = placeholderGroups.get(fullPath);
    if (existing) return existing;

    const parentPath = segments.slice(0, -1).join("/");
    const group: PlaceholderGroup = {
      id: `${FINAL_LAYOUT_NODE_ID}-ph-${slugify(fullPath)}`,
      label: segments[segments.length - 1] ?? fullPath,
      parentId: parentPath ? ensurePlaceholderGroup(parentPath).id : FINAL_LAYOUT_NODE_ID,
      controls: [],
    };
    placeholderGroups.set(fullPath, group);
    return group;
  }

  graph.controls.forEach((control, index) => {
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
        link: null,
        tooltip: buildTooltip(group.label, null, null),
      },
      classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
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
        classes: `${kindClass(NODE_KIND.CONTROL)} ${FILTER_CLASS.layout}`,
      });

      appendCompoundChildren(nodes, controlId, [
        {
          kind: NODE_KIND.DATASOURCE,
          value: lastPathSegment(control.datasource) ?? control.datasource,
          link: control.datasourceLink,
          path: control.datasource,
          filterClass: FILTER_CLASS.layout,
        },
        {
          kind: NODE_KIND.VARIANT,
          value: control.parameters.Variant ?? null,
          link: null,
          filterClass: FILTER_CLASS.layout,
        },
      ]);
    });
  });


  graph.sections.forEach((section) => {
    const sectionId = `${graph.itemId}-section-${slugify(section.name)}`;
    nodes.push({
      data: {
        id: sectionId,
        label: buildLabel(NODE_KIND.SECTION, section.name),
        link: null,
        tooltip: buildTooltip(section.name, null, null),
      },
      classes: `${kindClass(NODE_KIND.SECTION)} ${FILTER_CLASS.sections}`,
    });
    edges.push({ data: { id: `edge-${sectionId}`, source: graph.itemId, target: sectionId } });

    const fieldIds = appendCompoundChildren(
      nodes,
      sectionId,
      section.fields.map((field) => ({
        kind: field.label,
        value: field.value,
        category: NODE_KIND.FIELD,
        filterClass: FILTER_CLASS.sections,
      })),
    );

    // Fields a link-strategy recognized (rendering-graph-field-links.ts) get their referenced
    // items as their own clickable satellites, hung off the field's own compound node.
    section.fields.forEach((field, index) => {
      const fieldId = fieldIds[index];
      if (!fieldId || !field.links) return;
      appendSatellites(
        nodes,
        edges,
        fieldId,
        field.links.map((link) => ({
          kind: NODE_KIND.FIELD,
          value: link.label,
          link: buildFoblesUrl(link.itemId),
          path: link.itemId,
          filterClass: FILTER_CLASS.sections,
        })),
      );
    });
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
    ["Placeholder", data.placeholder],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => row[1] !== null);
  visibleRows.forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.style.cssText = index < visibleRows.length - 1 ? "margin-bottom:6px;" : "";
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    const valueText = document.createElement("span");
    valueText.style.fontWeight = "400";
    valueText.textContent = value;
    row.append(strong, valueText);
    container.appendChild(row);
  });

  return container;
}

// Lazily creates one tippy instance per node on first click, cached on the node itself (cytoscape's
// scratchpad, not `data()` - this is view-only state, not graph data) so later clicks reuse it.
// Tracks the single currently-shown instance so clicking a different node always hides whichever
// other tooltip was still open; clicking the SAME node again toggles its tooltip off.
let activeRenderingGraphTooltip: TippyInstance | null = null;

function getOrCreateTooltip(node: cytoscape.NodeSingular): TippyInstance {
  let tip = node.scratch("_foblesTooltip") as TippyInstance | undefined;
  if (!tip) {
    tip = node.popper({ content: () => buildTooltipContent(node.data("tooltip") as TooltipData) }) as TippyInstance;
    node.scratch("_foblesTooltip", tip);
    node.on("remove", () => tip?.destroy());
  }
  return tip;
}

function toggleTooltip(node: cytoscape.NodeSingular): void {
  const tip = getOrCreateTooltip(node);
  if (activeRenderingGraphTooltip === tip) {
    tip.hide();
    activeRenderingGraphTooltip = null;
    return;
  }
  activeRenderingGraphTooltip?.hide();
  activeRenderingGraphTooltip = tip;
  tip.show();
}

function hideActiveTooltip(): void {
  activeRenderingGraphTooltip?.hide();
  activeRenderingGraphTooltip = null;
}

// POC visualization: a cytoscape graph in a <dialog> injected into the active Content Editor
// page - no new tab/page/build entry needed. Plain-clicking a node with a link calls
// harvestForLink and, if it resolves, re-roots this SAME dialog's graph at that item (no
// navigation, no reopening); ctrl/cmd-click opens it in a new tab instead.
export function openRenderingGraphModal(
  doc: Document,
  graph: RenderingGraphResult,
  harvestForLink: (link: string) => Promise<RenderingGraphResult | null>,
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
  const graphHistory: RenderingGraphResult[] = [];
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
  function updateRootInfo(rootGraph: RenderingGraphResult): void {
    rootInfo.replaceChildren();
    const rows: Array<[string, string | null]> = [
      ["Name", rootGraph.itemName],
      ["GUID", rootGraph.itemId],
      ["Path", rootGraph.itemPath],
    ];
    rows
      .filter((row): row is [string, string] => row[1] !== null)
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
    activeRenderingGraphDialog = null;
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
      ...Object.entries(KIND_COLORS).map(([kind, color]) => ({
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
        selector: `.${kindClass(NODE_KIND.ITEM)}`,
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
  function renderGraph(newGraph: RenderingGraphResult): void {
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

  cy.on("mouseover", "node", (event) => {
    container.style.cursor = event.target.data("link") ? "pointer" : "default";
  });
  cy.on("mouseout", "node", () => {
    container.style.cursor = "default";
  });

  // Click vs double-click on the same node both fire "tap" (twice, for a double-click) before
  // cytoscape's own "dbltap" also fires - a short pending timer tells them apart: a second tap
  // arriving before it elapses cancels the single-click (tooltip) action in favor of "dbltap"'s
  // navigate action below, same debounce technique used for any click/dblclick disambiguation.
  let pendingTapTimeout: ReturnType<typeof setTimeout> | null = null;

  cy.on("tap", "node", (event) => {
    const link = event.target.data("link");
    const mouseEvent = event.originalEvent as MouseEvent | undefined;
    if (mouseEvent?.ctrlKey || mouseEvent?.metaKey) {
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    if (!link) return;

    if (pendingTapTimeout) {
      clearTimeout(pendingTapTimeout);
      pendingTapTimeout = null;
      return;
    }
    pendingTapTimeout = setTimeout(() => {
      pendingTapTimeout = null;
      toggleTooltip(event.target);
    }, 250);
  });

  // Tapping the empty canvas (not a node) dismisses whichever tooltip is still open.
  cy.on("tap", (event) => {
    if (event.target === cy) hideActiveTooltip();
  });

  cy.on("dbltap", "node", (event) => {
    if (pendingTapTimeout) {
      clearTimeout(pendingTapTimeout);
      pendingTapTimeout = null;
    }
    const link = event.target.data("link");
    if (!link) return;
    hideActiveTooltip();

    extensionLog.debug("Rendering graph: re-rooting at clicked node", { link });
    let cancelled = false;
    openRenderingGraphProgressModal(doc, () => {
      cancelled = true;
      closeRenderingGraphProgressModal(doc);
    });
    void harvestForLink(link).then((newGraph) => {
      closeRenderingGraphProgressModal(doc);
      // Not every item has a Layout section (templates, media, etc.) - expected, not an error.
      if (cancelled || !newGraph) return;
      graphHistory.push(currentGraph);
      renderGraph(newGraph);
    });
  });
}
