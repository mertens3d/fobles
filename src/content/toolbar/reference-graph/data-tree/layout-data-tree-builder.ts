// @source-path [Fobles] src/content/toolbar/reference-graph/components/data-builders/layout-tree-builder.ts

import type {
  ItemGraphNodeData,
  LayoutDevice,
  LayoutSectionField,
  ScControl,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import { slugify } from "../graph-nodes/graph-helpers";
import {
  createPlaceholderTreeNodes,
  type PlaceholderTreeNode,
} from "./placeholder-data-tree-builder";
import type { DataTreeNonItemNode, DataTreeNode, DataTreeItemNode } from "./data-tree.types";

export function createDataTreeNodeId(
  ...parts: Array<string | undefined>
): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .map(slugify)
    .join("-");
}

export function createLayoutDataTree(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode {
  const treeNodeId =
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID;

  return {
    treeNodeId,
    nodeType: "nonItem",
    name: "Layouts",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    relationshipToParent: "related",
    children: (graphReferenceResult.layoutSectionFields ?? []).map(
      createLayoutSectionTree,
    ),
  };
}

function createLayoutSectionTree(
  layout: LayoutSectionField,
): DataTreeNonItemNode {
  const treeNodeId = createDataTreeNodeId(
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
    layout.name,
  );

  return {
    treeNodeId,
    nodeType: "nonItem",
    name: layout.name ?? "",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    children: (layout.devices ?? []).map((device, deviceIndex) =>
      createDeviceTreeNode(treeNodeId, device, deviceIndex),
    ),
  };
}

function createDeviceTreeNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
): DataTreeNode {
  const treeNodeId = createDataTreeNodeId(
    layoutTreeNodeId,
    "device",
    device.scDeviceItem?.scItemId ?? String(deviceIndex),
  );

  const children = createPlaceholderTreeNodes(device.controls).map(
    (placeholder) =>
      createPlaceholderDataTreeNode(treeNodeId, placeholder),
  );

  if (device.scLayoutViewItem) {
    return createItemTreeNode(
      treeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
      device.scLayoutViewItem,
      children,
    );
  }

  return {
    treeNodeId,
    nodeType: "nonItem",
    name:
      device.scDeviceItem?.scItemId ??
      "Unknown device",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
    branch: "layouts",
    children,
  };
}

function createPlaceholderDataTreeNode(
  deviceTreeNodeId: string,
  placeholder: PlaceholderTreeNode,
): DataTreeNonItemNode {
  const placeholderSegments = placeholder.path.split("/");
  const placeholderName =
    placeholderSegments[placeholderSegments.length - 1] ??
    placeholder.path;

  const children: DataTreeNode[] = [];

  placeholder.placeholders.forEach((childPlaceholder) => {
    children.push(
      createPlaceholderDataTreeNode(
        deviceTreeNodeId,
        childPlaceholder,
      ),
    );
  });

  placeholder.controls.forEach((control, controlIndex) => {
    children.push(
      createRenderingTree(
        deviceTreeNodeId,
        control,
        controlIndex,
      ),
    );
  });

  return {
    treeNodeId: createDataTreeNodeId(
      deviceTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    nodeType: "nonItem",
    name: placeholderName,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  };
}

export function createRenderingTree(
  deviceTreeNodeId: string,
  control: ScControl,
  controlIndex: number,
): DataTreeItemNode {
  const rendering = control.rendering;

  const treeNodeId = createDataTreeNodeId(
    deviceTreeNodeId,
    "rendering",
    control.uid ??
      rendering.scItemId ??
      String(controlIndex),
  );

  const children: DataTreeNode[] = [];

  if (control.datasource) {
    children.push(
      createDatasourceTreeNode(
        treeNodeId,
        control.datasource,
      ),
    );
  }

  const parameters = Object.entries(control.parameters);

  if (parameters.length > 0) {
    children.push(
      createRenderingParametersTreeNode(
        treeNodeId,
        parameters,
      ),
    );
  }

  return {
    treeNodeId,
    nodeType: "item",
    scItem: rendering,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  };
}

function createDatasourceTreeNode(
  renderingTreeNodeId: string,
  datasource: ItemGraphNodeData,
): DataTreeItemNode {
  return createItemTreeNode(
    createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.DATASOURCE,
    ),
    CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
    datasource,
    [],
  );
}

function createRenderingParametersTreeNode(
  renderingTreeNodeId: string,
  parameters: Array<[string, string]>,
): DataTreeNonItemNode {
  return {
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETERS,
    ),
    nodeType: "nonItem",
    name: "Rendering Parameters",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    children: parameters.map(([name, value]) =>
      createSingleParameterTreeNode(
        name,
        value,
        renderingTreeNodeId,
      ),
    ),
  };
}

function createSingleParameterTreeNode(
  name: string,
  value: string,
  renderingTreeNodeId: string,
): DataTreeNonItemNode {
  return {
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETER,
      name,
    ),
    nodeType: "nonItem",
    name: value
      ? `${name}: ${value}`
      : name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    children: [],
  };
}

function createItemTreeNode(
  treeNodeId: string,
  kind: DataTreeItemNode["kind"],
  scItem: ItemGraphNodeData,
  children: DataTreeNode[],
): DataTreeItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem,
    kind,
    branch: "layouts",
    children,
  };
}