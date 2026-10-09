import type cytoscape from "cytoscape";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { buildTooltip } from "./graph-tooltip";
import { GRAPHCONST, FILTER_CLASS } from "./graph.const";
import { buildLabel, kindClass, appendCompoundChildren, appendSatellites, lastPathSegment, stripDynamicPlaceholderSuffix, slugify } from "./rendering-graph-modal";
import type { RenderingGraphControl, ReferenceGraphResult } from "./rendering-graph.types";

export type SatelliteDescriptor = {
  kind: string;
  value: string | undefined;
  link?: string | undefined;
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
  path?: string | undefined;
  // Visually nests this node inside a compound box (e.g. the Layout super-compound) on top of
  // its normal edge - nesting and edges are independent in cytoscape, so both can apply at once.
  compoundParent?: string;
  // Skips the "[kind]" suffix buildLabel normally adds - for kinds whose container already makes
  // that implicit (e.g. a Child inside the "Children" box), same as Control nodes do already.
  plainLabel?: boolean;
};export type TooltipData = {
  name: string | undefined;
  guid: string | undefined;
  path: string | undefined;
  placeholder: string | undefined;
};
export type ParsedDevice = {
  layoutId: string | undefined;
  controls: RenderingGraphControl[];
};


export type TreeChildNode = {
    name: string | undefined;
    itemId: string;
};
export type GlyphState = "expanded" | "collapsed" | "leaf";
export function buildElements(graph: ReferenceGraphResult): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = [
    {
      data: {
        id: graph.itemId,
        label: buildLabel(GRAPHCONST.NODE_KIND.ITEM, graph.itemName ?? graph.itemId),
        link: graph.itemLink,
        tooltip: buildTooltip(graph.itemName, graph.itemId, graph.itemPath),
      },
      classes: kindClass(GRAPHCONST.NODE_KIND.ITEM),
    },
  ];
  const edges: cytoscape.ElementDefinition[] = [];

  // The item itself is the only guaranteed node - everything else (device/layout, controls,
  // template, parent, children, sections) only gets added when there's actual data for it.
  const hasLayoutData = graph.controls.length > 0 || Boolean(graph.sharedLayoutName);
  if (hasLayoutData) {
    // Layout wraps Shared Layout (Renderings) and Final Layout (Final renderings), each of which
    // wraps its own Default device - mirrors Sitecore's own Layout Details dialog, where each
    // field independently lists Default/Mobile/Print/... rather than sharing one device node.
    nodes.push(
      {
        data: {
          id: GRAPHCONST.NODE_ID.LAYOUT_BOX_NODE_ID,
          label: "Layout",
          link: undefined,
          tooltip: buildTooltip("Layout (device/renderings/datasources)", undefined, undefined),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: GRAPHCONST.NODE_ID.SHARED_LAYOUT_NODE_ID,
          parent: GRAPHCONST.NODE_ID.LAYOUT_BOX_NODE_ID,
          label: "Shared Layout",
          link: undefined,
          tooltip: buildTooltip("Shared Layout (Renderings field)", undefined, undefined),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: GRAPHCONST.NODE_ID.SHARED_LAYOUT_DEVICE_NODE_ID,
          parent: GRAPHCONST.NODE_ID.SHARED_LAYOUT_NODE_ID,
          label: buildLabel(GRAPHCONST.NODE_KIND.DEVICE, "Default"),
          link: undefined,
          tooltip: buildTooltip("Default device", undefined, undefined),
        },
        classes: `${kindClass(GRAPHCONST.NODE_KIND.DEVICE)} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: GRAPHCONST.NODE_ID.FINAL_LAYOUT_NODE_ID,
          parent: GRAPHCONST.NODE_ID.LAYOUT_BOX_NODE_ID,
          label: "Final Layout",
          link: undefined,
          tooltip: buildTooltip("Final Layout (Final renderings field)", undefined, undefined),
        },
        classes: `${kindClass("structural")} ${FILTER_CLASS.layout}`,
      },
      {
        data: {
          id: GRAPHCONST.NODE_ID.FINAL_LAYOUT_DEVICE_NODE_ID,
          parent: GRAPHCONST.NODE_ID.FINAL_LAYOUT_NODE_ID,
          label: buildLabel(GRAPHCONST.NODE_KIND.DEVICE, "Default"),
          link: undefined,
          tooltip: buildTooltip("Default device", undefined, undefined),
        },
        classes: `${kindClass(GRAPHCONST.NODE_KIND.DEVICE)} ${FILTER_CLASS.layout}`,
      }
    );
    edges.push({ data: { id: "edge-layout", source: graph.itemId, target: GRAPHCONST.NODE_ID.LAYOUT_BOX_NODE_ID } });

    appendCompoundChildren(nodes, GRAPHCONST.NODE_ID.SHARED_LAYOUT_DEVICE_NODE_ID, [
      {
        kind: GRAPHCONST.NODE_KIND.LAYOUT,
        value: graph.sharedLayoutName,
        link: graph.sharedLayoutLink,
        path: graph.sharedLayoutPath,
        filterClass: FILTER_CLASS.layout,
      },
    ]);
  }

  appendSatellites(nodes, edges, graph.itemId, [
    {
      kind: GRAPHCONST.NODE_KIND.TEMPLATE,
      value: lastPathSegment(graph.itemTemplate) ?? graph.itemTemplate,
      link: graph.itemTemplateLink,
      path: graph.itemTemplate,
      filterClass: FILTER_CLASS.template,
    },
    {
      kind: GRAPHCONST.NODE_KIND.PARENT,
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
        link: undefined,
        tooltip: buildTooltip(`${graph.childItems.length} item(s)`, undefined, undefined),
      },
      classes: `${kindClass("structural")} ${FILTER_CLASS.children}`,
    });
    edges.push({ data: { id: "edge-children", source: graph.itemId, target: childrenId } });

    appendCompoundChildren(
      nodes,
      childrenId,
      graph.childItems.map((child) => ({
        kind: GRAPHCONST.NODE_KIND.CHILD,
        value: child.name,
        link: child.link,
        filterClass: FILTER_CLASS.children,
        plainLabel: true,
      }))
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
        link: undefined,
        tooltip: buildTooltip(`${graph.referrers.length} item(s)`, undefined, undefined),
      },
      classes: `${kindClass("structural")} ${FILTER_CLASS.referrers}`,
    });
    edges.push({ data: { id: "edge-referrers", source: referrersId, target: graph.itemId } });

    appendCompoundChildren(
      nodes,
      referrersId,
      graph.referrers.map((referrer) => ({
        kind: GRAPHCONST.NODE_KIND.REFERRER,
        value: referrer.name,
        link: referrer.link,
        path: referrer.path,
        filterClass: FILTER_CLASS.referrers,
        plainLabel: true,
      }))
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
    controls: Array<{ control: (typeof graph.controls)[number]; index: number; }>;
  };

  const placeholderGroups = new Map<string, PlaceholderGroup>();
  function ensurePlaceholderGroup(rawPath: string): PlaceholderGroup {
    const segments = rawPath.split("/").filter(Boolean).map(stripDynamicPlaceholderSuffix);
    const fullPath = segments.length > 0 ? segments.join("/") : rawPath;
    const existing = placeholderGroups.get(fullPath);
    if (existing) return existing;

    const parentPath = segments.slice(0, -1).join("/");
    const group: PlaceholderGroup = {
      id: `${GRAPHCONST.NODE_ID.FINAL_LAYOUT_NODE_ID}-ph-${slugify(fullPath)}`,
      label: segments[segments.length - 1] ?? fullPath,
      parentId: parentPath ? ensurePlaceholderGroup(parentPath).id : GRAPHCONST.NODE_ID.FINAL_LAYOUT_DEVICE_NODE_ID,
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
        link: undefined,
        tooltip: buildTooltip(group.label, undefined, undefined),
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
        classes: `${kindClass(GRAPHCONST.NODE_KIND.CONTROL)} ${FILTER_CLASS.layout}`,
      });

      appendCompoundChildren(nodes, controlId, [
        {
          kind: GRAPHCONST.NODE_KIND.DATASOURCE,
          value: lastPathSegment(control.datasource) ?? control.datasource,
          link: control.datasourceLink,
          path: control.datasource,
          filterClass: FILTER_CLASS.layout,
        },
        {
          kind: GRAPHCONST.NODE_KIND.VARIANT,
          value: control.parameters.Variant ?? undefined,
          link: undefined,
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
        label: buildLabel(GRAPHCONST.NODE_KIND.SECTION, section.name),
        link: undefined,
        tooltip: buildTooltip(section.name, undefined, undefined),
      },
      classes: `${kindClass(GRAPHCONST.NODE_KIND.SECTION)} ${FILTER_CLASS.sections}`,
    });
    edges.push({ data: { id: `edge-${sectionId}`, source: graph.itemId, target: sectionId } });

    const fieldIds = appendCompoundChildren(
      nodes,
      sectionId,
      section.fields.map((field) => ({
        kind: field.label,
        value: field.value,
        category: GRAPHCONST.NODE_KIND.FIELD,
        filterClass: FILTER_CLASS.sections,
      }))
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
          kind: GRAPHCONST.NODE_KIND.FIELD,
          value: link.label,
          link: buildFoblesUrl(link.itemId),
          path: link.itemId,
          filterClass: FILTER_CLASS.sections,
        }))
      );
    });
  });

  return [...nodes, ...edges];
}
// POC: harvests the active item's default-device layout straight from the Content Editor's own
// Layout section, instead of navigating LayoutDetails/DeviceEditor/SelectRendering/Field Editor -
// requires View > Standard Fields and View > Raw Values both enabled so the raw layout XML field
// is actually on the page. See src/rendering graph/README.md for the research behind this. Both
// toggles are enabled/restored automatically (see the resume machine at the bottom of this file)
// since flipping either one is a full page postback that destroys this execution context. The
// harvested graph rides along in the same persisted pending state, since the restore step's own
// reload would otherwise wipe it before the modal can be shown.
export type PendingRenderingGraph = {
  itemId: string;
  restoreRawValues: boolean;
  restoreStandardFields: boolean;
  harvested: boolean;
  cancelled: boolean;
  graph: ReferenceGraphResult | undefined;
};
export type LayoutPreset = {
    label: string;
    build: () => cytoscape.LayoutOptions;
};
export type LayoutPresetName = "dagre" | "cose-bilkent" | "fcose" | "breadthfirst";



