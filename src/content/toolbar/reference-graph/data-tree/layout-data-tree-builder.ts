// @source-path [fobles] src/content/toolbar/reference-graph/data-tree/layout-data-tree-builder.ts

import type {
  ItemGraphNodeData,
  LayoutDevice,
  LayoutSectionField,
  ScControl,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import type {
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
} from "./data-tree.types";
import {
  createPlaceholderTreeNodes,
  type PlaceholderTreeNode,
} from "./placeholder-data-tree-builder";
import { slugify } from "../reference-graph-helper";

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

  return createDataTreeNonItemNode({
    treeNodeId,
    name: "Layouts",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    relationshipToParent: "related",
    children: (graphReferenceResult.layoutSectionFields ?? []).map(
      createLayoutSectionDataTree,
    ),
  });
}

function createLayoutSectionDataTree(
  layout: LayoutSectionField,
): DataTreeNonItemNode {
  const treeNodeId = createDataTreeNodeId(
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
    layout.name,
  );

  return createDataTreeNonItemNode({
    treeNodeId,
    name: layout.name ?? "",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    children: (layout.devices ?? []).map(
      (device, deviceIndex) =>
        createDeviceDataTreeNode(
          treeNodeId,
          device,
          deviceIndex,
        ),
    ),
  });
}

function createDeviceDataTreeNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
): DataTreeNode {
  const treeNodeId = createDataTreeNodeId(
    layoutTreeNodeId,
    "device",
    device.scDeviceItem?.scItemId ?? String(deviceIndex),
  );

  const children = createPlaceholderTreeNodes(
    device.controls,
  ).map((placeholder) =>
    createPlaceholderDataTreeNode(
      treeNodeId,
      placeholder,
    ),
  );

  let deviceTreeNode: DataTreeNode;

  if (device.scLayoutViewItem) {
    deviceTreeNode = createDataTreeItemNode({
      treeNodeId,
      scItem: device.scLayoutViewItem,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
      branch: "layouts",
      children,
    });
  } else {
    deviceTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name:
        device.scDeviceItem?.scItemId ??
        "Unknown device",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
      branch: "layouts",
      children,
    });
  }

  return deviceTreeNode;
}

function createPlaceholderDataTreeNode(
  deviceTreeNodeId: string,
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
          deviceTreeNodeId,
          childPlaceholder,
        ),
      );
    },
  );

  placeholder.controls.forEach(
    (control, controlIndex) => {
      children.push(
        createRenderingDataTree(
          deviceTreeNodeId,
          control,
          controlIndex,
        ),
      );
    },
  );

  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      deviceTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    name: placeholderName,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

export function createRenderingDataTree(
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
      createDatasourceDataTreeNode(
        treeNodeId,
        control.datasource,
      ),
    );
  }

  const parameters = Object.entries(
    control.parameters,
  );

  if (parameters.length > 0) {
    children.push(
      createRenderingParametersDataTreeNode(
        treeNodeId,
        parameters,
      ),
    );
  }

  return createDataTreeItemNode({
    treeNodeId,
    scItem: rendering,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createDatasourceDataTreeNode(
  renderingTreeNodeId: string,
  datasource: ItemGraphNodeData,
): DataTreeItemNode {
  return createDataTreeItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.DATASOURCE,
    ),
    scItem: datasource,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
    branch: "layouts",
  });
}

function createRenderingParametersDataTreeNode(
  renderingTreeNodeId: string,
  parameters: Array<[string, string]>,
): DataTreeNonItemNode {
  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETERS,
    ),
    name: "Rendering Parameters",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
    children: parameters.map(([name, value]) =>
      createSingleParameterDataTreeNode(
        name,
        value,
        renderingTreeNodeId,
      ),
    ),
  });
}

function createSingleParameterDataTreeNode(
  name: string,
  value: string,
  renderingTreeNodeId: string,
): DataTreeNonItemNode {
  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETER,
      name,
    ),
    name: value
      ? `${name}: ${value}`
      : name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    branch: "layouts",
  });
}