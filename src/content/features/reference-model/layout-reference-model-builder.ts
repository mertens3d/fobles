// @source-path [fobles] src/content/features/reference-model/layout-reference-model-builder.ts

import { CONST } from "../../../constants/const";
import { slugify } from "../reference-graph/reference-graph-helper";
import { GRAPH_COLLAPSE_KEY } from "../reference-graph/graph-nodes/graph-collapse.types";
import type { LayoutSectionField, ItemGraphNodeData, LayoutDevice, ScControl } from "./sitecore-item.types";
import { createPlaceholderTreeNodes } from "./placeholder-reference-model-builder";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { createSyntheticProvenance, createSitecoreItemProvenance } from "./reference-model-provenance.types";
import type { ReferenceModelNonItemNode, ReferenceModelItemNode, ReferenceModelNode, PlaceholderTreeNode } from "./reference-model.types";
import { createRenderingReferenceModelNode } from "./rendering-reference-model-builder";

export function createReferenceModelNodeId(...parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).map(slugify).join("-");
}

export function createPageLayoutItemsByDeviceId(
  layoutSectionFields: readonly LayoutSectionField[],
): Map<string, ItemGraphNodeData> {
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
    children: layout.devices.map((device, deviceIndex) =>
      createDeviceReferenceModelNode(treeNodeId, device, deviceIndex, pageLayoutItemsByDeviceId),
    ),
  });
}

function createDeviceReferenceModelNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
  pageLayoutItemsByDeviceId: Map<string, ItemGraphNodeData>,
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(layoutTreeNodeId, "device", device.scDeviceItem.scItemId ?? String(deviceIndex));
  const pageLayoutItem =
    device.scPageLayoutItem ??
    (device.scDeviceItem.scItemId ? pageLayoutItemsByDeviceId.get(device.scDeviceItem.scItemId) : undefined);
  const children: ReferenceModelNode[] = [];

  if (pageLayoutItem) {
    children.push(createPageLayoutReferenceModelNode(treeNodeId, pageLayoutItem, device.scControls));
  } else {
    children.push(createMissingPageLayoutReferenceModelNode(treeNodeId, device.scControls));
  }

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: device.scDeviceItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
    provenance: { type: "layout-device", device },
    collapseKey: GRAPH_COLLAPSE_KEY.DEVICE,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createMissingPageLayoutReferenceModelNode(deviceTreeNodeId: string, controls: ScControl[]): ReferenceModelNonItemNode {
  const pageLayoutTreeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout");

  return createReferenceModelNonItemNode({
    treeNodeId: pageLayoutTreeNodeId,
    name: "Page Layout (does not exist)",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSyntheticProvenance("Page Layout (does not exist)"),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: createPlaceholderTreeNodes(controls).map((placeholder) =>
      createPlaceholderReferenceModelNode(pageLayoutTreeNodeId, placeholder),
    ),
  });
}

function createPageLayoutReferenceModelNode(
  deviceTreeNodeId: string,
  pageLayoutItem: ItemGraphNodeData,
  controls: ScControl[],
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout", pageLayoutItem.scItemId);
  const children = createPlaceholderTreeNodes(controls).map((placeholder) =>
    createPlaceholderReferenceModelNode(treeNodeId, placeholder),
  );

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: pageLayoutItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSitecoreItemProvenance(pageLayoutItem),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createPlaceholderReferenceModelNode(
  pageLayoutTreeNodeId: string,
  placeholder: PlaceholderTreeNode,
): ReferenceModelNonItemNode {
  const placeholderSegments = placeholder.path.split("/");
  const placeholderName = placeholderSegments[placeholderSegments.length - 1] ?? placeholder.path;
  const children: ReferenceModelNode[] = [];

  placeholder.placeholders.forEach((childPlaceholder) => {
    children.push(createPlaceholderReferenceModelNode(pageLayoutTreeNodeId, childPlaceholder));
  });

  placeholder.controls.forEach((control, controlIndex) => {
    children.push(createRenderingReferenceModelNode(pageLayoutTreeNodeId, control, controlIndex));
  });

  return createReferenceModelNonItemNode({
    treeNodeId: createReferenceModelNodeId(
      pageLayoutTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    name: placeholderName,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PLACEHOLDER,
    provenance: {
      type: "placeholder",
      placeholderPath: placeholder.path,
      displayName: placeholderName,
      rawData: placeholder.controls.map((control) => ({ "s:ph": control.rawData["s:ph"] })),
    },
    collapseKey: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}