import type cytoscape from "cytoscape";
import { slugify, kindClass } from "../graph-helpers";
import { buildTooltip } from "../graph-tooltip";
import type { SatelliteDescriptor } from "../reference-graph.types";

export function buildLabel(kind: string, name: string): string {
  return `${name}\n[${kind.toLowerCase()}]`;
}// Several referenced-item fields arrive as a full Sitecore path, not just a name - shown
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
