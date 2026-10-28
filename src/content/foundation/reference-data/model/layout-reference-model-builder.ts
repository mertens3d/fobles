// @source-path [fobles] src/content/foundation/reference-data/model/layout-reference-model-builder.ts

import { CONST } from "../../../../constants/const";
import { GRAPH_COLLAPSE_KEY } from "./graph-collapse.types";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { createSitecoreItemProvenance, createSyntheticProvenance } from "./reference-model-provenance.types";
import type { ReferenceModelItemNode, ReferenceModelNode, ReferenceModelNonItemNode } from "./reference-model.types";
import { createRenderingReferenceModelNode } from "./rendering-reference-model-builder";
import { slugify } from "./slugify";
import type { ItemGraphNodeData, LayoutDevice, LayoutPlacement, LayoutSectionField, ScControl } from "./sitecore-item.types";

export function createReferenceModelNodeId(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).map(slugify).join("-");
}

export function createPageLayoutItemsByDeviceId(layoutSectionFields: readonly LayoutSectionField[]): Map<string, ItemGraphNodeData> {
  const pageLayoutItemsByDeviceId = new Map<string, ItemGraphNodeData>();

  layoutSectionFields.forEach((layoutSectionField) => {
    layoutSectionField.devices.forEach((device) => {
      const deviceId = device.scDeviceItem.scItemId;
      const pageLayoutItem = device.scPageLayoutItem;

      if (deviceId && pageLayoutItem?.scItemId && !pageLayoutItemsByDeviceId.has(deviceId)) {
        pageLayoutItemsByDeviceId.set(deviceId, pageLayoutItem);
      }
    });
  });

  return pageLayoutItemsByDeviceId;
}

export function createLayoutSectionReferenceModel(
  layout: LayoutSectionField,
  pageLayoutItemsByDeviceId: Map<string, ItemGraphNodeData>,
): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID, layout.name);

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: layout.name ?? "",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    provenance: layout.rawMarkup
      ? { type: "layout-xml", label: layout.name ?? "Layout", rawMarkup: layout.rawMarkup }
      : createSyntheticProvenance(layout.name ?? "Layout"),
    collapseKey: GRAPH_COLLAPSE_KEY.LAYOUT_SECTION,
    branch: "layouts",
    relationshipToParent: "related",
    children: layout.devices.map((device, deviceIndex) => createDeviceReferenceModelNode(treeNodeId, device, deviceIndex, pageLayoutItemsByDeviceId)),
  });
}

function createDeviceReferenceModelNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
  pageLayoutItemsByDeviceId: Map<string, ItemGraphNodeData>,
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(layoutTreeNodeId, "device", device.scDeviceItem.scItemId ?? String(deviceIndex));
  const pageLayoutItem = device.scPageLayoutItem
    ?? (device.scDeviceItem.scItemId ? pageLayoutItemsByDeviceId.get(device.scDeviceItem.scItemId) : undefined);
  const pageLayoutNode = pageLayoutItem
    ? createPageLayoutReferenceModelNode(treeNodeId, pageLayoutItem, device.placements)
    : createMissingPageLayoutReferenceModelNode(treeNodeId, device.placements);

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: device.scDeviceItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
    provenance: { type: "layout-device", device },
    collapseKey: GRAPH_COLLAPSE_KEY.DEVICE,
    branch: "layouts",
    relationshipToParent: "related",
    children: [pageLayoutNode],
  });
}

function createMissingPageLayoutReferenceModelNode(
  deviceTreeNodeId: string,
  placements: readonly LayoutPlacement[],
): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout");

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: "Page Layout (does not exist)",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSyntheticProvenance("Page Layout (does not exist)"),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: placements.map((placement) => createPlacementReferenceModelNode(treeNodeId, placement)),
  });
}

function createPageLayoutReferenceModelNode(
  deviceTreeNodeId: string,
  pageLayoutItem: ItemGraphNodeData,
  placements: readonly LayoutPlacement[],
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout", pageLayoutItem.scItemId);

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: pageLayoutItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSitecoreItemProvenance(pageLayoutItem),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: placements.map((placement) => createPlacementReferenceModelNode(treeNodeId, placement)),
  });
}

function createPlacementReferenceModelNode(scopeTreeNodeId: string, placement: LayoutPlacement): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(
    scopeTreeNodeId,
    CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
    placement.path,
  );
  const children: ReferenceModelNode[] = [
    ...placement.placements.map((childPlacement) => createPlacementReferenceModelNode(treeNodeId, childPlacement)),
    ...placement.controls.map((control, controlIndex) => createRenderingReferenceModelNode(treeNodeId, control, controlIndex)),
  ];

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: placement.name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PLACEHOLDER,
    provenance: {
      type: "placeholder",
      placeholderPath: placement.path,
      displayName: placement.name,
      rawData: placement.controls.map((control: ScControl) => ({ "s:ph": control.rawData["s:ph"] })),
    },
    collapseKey: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}
