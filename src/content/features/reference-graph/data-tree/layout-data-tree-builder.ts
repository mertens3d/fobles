// @source-path [fobles] src/content/features/reference-graph/data-tree/layout-data-tree-builder.ts

import { CONST } from "../../../../constants/const";
import type {
  ItemGraphNodeData,
  LayoutDevice,
  LayoutSectionField,
  ScControl,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  slugify,
} from "../reference-graph-helper";
import {
  GRAPH_COLLAPSE_KEY,
} from "../graph-nodes/graph-collapse.types";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import {
  createSitecoreItemProvenance,
  createSyntheticProvenance,
} from "./data-tree-provenance.types";
import type {
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
} from "./data-tree.types";
import {
  createPlaceholderTreeNodes,
  type PlaceholderTreeNode,
} from "./placeholder-data-tree-builder";
import {
  createRenderingDataTreeNode,
} from "./rendering-data-tree-builder";

export function createDataTreeNodeId(
  ...parts: Array<string | undefined>
): string {
  return parts
    .filter(
      (part): part is string =>
        Boolean(part),
    )
    .map(slugify)
    .join("-");
}

export function createPageLayoutItemsByDeviceId(
  layoutSectionFields: LayoutSectionField[],
): Map<string, ItemGraphNodeData> {
  const pageLayoutItemsByDeviceId = 
    new Map<string, ItemGraphNodeData>();

  layoutSectionFields.forEach(
    (layoutSectionField) => {
      layoutSectionField.devices.forEach(
        (device) => {
          const deviceId =
            device.scDeviceItem.scItemId;

          const pageLayoutItem =
            device.scPageLayoutItem;

          if (
            deviceId &&
            pageLayoutItem?.scItemId &&
            !pageLayoutItemsByDeviceId.has(
              deviceId,
            )
          ) {
            pageLayoutItemsByDeviceId.set(
              deviceId,
              pageLayoutItem,
            );
          }
        },
      );
    },
  );

  return pageLayoutItemsByDeviceId;
}

export function createLayoutSectionDataTree(
  layout: LayoutSectionField,
  pageLayoutItemsByDeviceId: Map<
    string,
    ItemGraphNodeData
  >,
): DataTreeNonItemNode {
  const treeNodeId = createDataTreeNodeId(
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID
      .MAIN_LAYOUT_BOX_NODE_ID,
    layout.name,
  );

  return createDataTreeNonItemNode({
    treeNodeId,
    name: layout.name ?? "",
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .STRUCTURAL,
    provenance: layout.rawMarkup
      ? { type: "layout-xml", label: layout.name ?? "Layout", rawMarkup: layout.rawMarkup }
      : createSyntheticProvenance(layout.name ?? "Layout"),
    collapseKey:
      GRAPH_COLLAPSE_KEY.LAYOUT_SECTION,
    branch: "layouts",
    relationshipToParent: "related",
    children: layout.devices.map(
      (device, deviceIndex) =>
        createDeviceDataTreeNode(
          treeNodeId,
          device,
          deviceIndex,
          pageLayoutItemsByDeviceId,
        ),
    ),
  });
}

function createDeviceDataTreeNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
  pageLayoutItemsByDeviceId: Map<
    string,
    ItemGraphNodeData
  >,
): DataTreeItemNode {
  const treeNodeId = createDataTreeNodeId(
    layoutTreeNodeId,
    "device",
    device.scDeviceItem.scItemId ??
    String(deviceIndex),
  );

  const pageLayoutItem =
    device.scPageLayoutItem ??
    (device.scDeviceItem.scItemId
      ? pageLayoutItemsByDeviceId.get(
        device.scDeviceItem.scItemId,
      )
      : undefined);

  const children: DataTreeNode[] = [];

  if (pageLayoutItem) {
    children.push(
      createPageLayoutDataTreeNode(
        treeNodeId,
        pageLayoutItem,
        device.scControls,
      ),
    );
  } else {
    children.push(
      createMissingPageLayoutDataTreeNode(
        treeNodeId,
        device.scControls,
      ),
    );
  }

  return createDataTreeItemNode({
    treeNodeId,
    scItem: device.scDeviceItem,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .DEVICE,
    provenance: { type: "layout-device", device },
    collapseKey:
      GRAPH_COLLAPSE_KEY.DEVICE,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createMissingPageLayoutDataTreeNode(
  deviceTreeNodeId: string,
  controls: ScControl[],
): DataTreeNonItemNode {
  const pageLayoutTreeNodeId =
    createDataTreeNodeId(
      deviceTreeNodeId,
      "page-layout",
    );

  return createDataTreeNonItemNode({
    treeNodeId: pageLayoutTreeNodeId,
    name: "Page Layout (does not exist)",
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .PAGE_LAYOUT,
    provenance: createSyntheticProvenance("Page Layout (does not exist)"),
    collapseKey:
      GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: createPlaceholderTreeNodes(
      controls,
    ).map((placeholder) =>
      createPlaceholderDataTreeNode(
        pageLayoutTreeNodeId,
        placeholder,
      ),
    ),
  });
}

function createPageLayoutDataTreeNode(
  deviceTreeNodeId: string,
  pageLayoutItem: ItemGraphNodeData,
  controls: ScControl[],
): DataTreeItemNode {
  const treeNodeId = createDataTreeNodeId(
    deviceTreeNodeId,
    "page-layout",
    pageLayoutItem.scItemId,
  );

  const children =
    createPlaceholderTreeNodes(
      controls,
    ).map((placeholder) =>
      createPlaceholderDataTreeNode(
        treeNodeId,
        placeholder,
      ),
    );

  return createDataTreeItemNode({
    treeNodeId,
    scItem: pageLayoutItem,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .PAGE_LAYOUT,
    provenance: createSitecoreItemProvenance(pageLayoutItem),
    collapseKey:
      GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createPlaceholderDataTreeNode(
  pageLayoutTreeNodeId: string,
  placeholder: PlaceholderTreeNode,
): DataTreeNonItemNode {
  const placeholderSegments =
    placeholder.path.split("/");

  const placeholderName =
    placeholderSegments[
      placeholderSegments.length - 1
    ] ?? placeholder.path;

  const children: DataTreeNode[] = [];

  placeholder.placeholders.forEach(
    (childPlaceholder) => {
      children.push(
        createPlaceholderDataTreeNode(
          pageLayoutTreeNodeId,
          childPlaceholder,
        ),
      );
    },
  );

  placeholder.controls.forEach(
    (control, controlIndex) => {
      children.push(
        createRenderingDataTreeNode(
          pageLayoutTreeNodeId,
          control,
          controlIndex,
        ),
      );
    },
  );

  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      pageLayoutTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH
        .LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    name: placeholderName,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .STRUCTURAL,
    provenance: {
      type: "placeholder",
      placeholderPath: placeholder.path,
      displayName: placeholderName,
    },
    collapseKey:
      GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}