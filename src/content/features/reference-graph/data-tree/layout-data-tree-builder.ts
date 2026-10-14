// @source-path [fobles] src/content/features/reference-graph/data-tree/layout-data-tree-builder.ts

import {
  factoryItemGraphNodeData,
  type ItemGraphNodeData,
  type LayoutDevice,
  type LayoutSectionField,
  type ScControl,
  type SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import { isGuidLike } from "../../augmentor/shared/guid";
import { extensionLog } from "../../../logger";
import {
  slugify,
} from "../reference-graph-helper";
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
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";

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

export function createLayoutDataTree(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode {
  const treeNodeId =
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID
      .MAIN_LAYOUT_BOX_NODE_ID;

  const pageLayoutItemsByDeviceId =
    createPageLayoutItemsByDeviceId(
      graphReferenceResult.layoutSectionFields ??
      [],
    );

  return createDataTreeNonItemNode({
    treeNodeId,
    name: "Layouts",
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .STRUCTURAL,
    collapseKey:
      GRAPH_COLLAPSE_KEY.LAYOUTS,
    branch: "layouts",
    relationshipToParent: "related",
    children: (
      graphReferenceResult.layoutSectionFields ??
      []
    ).map((layout) =>
      createLayoutSectionDataTree(
        layout,
        pageLayoutItemsByDeviceId,
      ),
    ),
  });
}

function createPageLayoutItemsByDeviceId(
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

function createLayoutSectionDataTree(
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
    collapseKey:
      GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createRenderingDataTreeNode(
  pageLayoutTreeNodeId: string,
  control: ScControl,
  controlIndex: number,
): DataTreeItemNode {
  const rendering = control.rendering;

  const renderingTreeNodeId =
    createDataTreeNodeId(
      pageLayoutTreeNodeId,
      "rendering",
      control.uid ??
      rendering.scItemId ??
      String(controlIndex),
    );

  const children: DataTreeNode[] = [];

  if (control.datasource) {
    children.push(
      createDatasourceDataTreeNode(
        renderingTreeNodeId,
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
        renderingTreeNodeId,
        parameters,
      ),
    );
  }

  return createDataTreeItemNode({
    treeNodeId: renderingTreeNodeId,
    scItem: rendering,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .RENDERING,
    collapseKey:
      GRAPH_COLLAPSE_KEY.RENDERING,
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
      CONST.FOBLES.REFERENCE_GRAPH
        .LAYOUT_SCOPE.DATASOURCE,
    ),
    scItem: datasource,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .DATASOURCE,
    collapseKey:
      GRAPH_COLLAPSE_KEY.DATASOURCE,
    branch: "layouts",
    relationshipToParent: "related",
  });
}

function createRenderingParametersDataTreeNode(
  renderingTreeNodeId: string,
  parameters: Array<[string, string]>,
): DataTreeNonItemNode {
  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH
        .LAYOUT_SCOPE.PARAMETERS,
    ),
    name: "Rendering Parameters",
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .STRUCTURAL,
    collapseKey:
      GRAPH_COLLAPSE_KEY
        .RENDERING_PARAMETERS,
    branch: "layouts",
    relationshipToParent: "related",
    children: parameters.map(
      ([name, value]) =>
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
): DataTreeNode {
  const treeNodeId = createDataTreeNodeId(
    renderingTreeNodeId,
    CONST.FOBLES.REFERENCE_GRAPH
      .LAYOUT_SCOPE.PARAMETER,
    name,
  );

  const candidateValue =
    decodeURIComponent(value);

  extensionLog.debug(
    "Parameter candidate values:",
    value,
    candidateValue,
    isGuidLike(candidateValue),
  );

  if (isGuidLike(candidateValue)) {
    return createDataTreeItemNode({
      treeNodeId,
      scItem: factoryItemGraphNodeData({
        scItemId: candidateValue,
      }),
      kind:
        CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
          .RENDERING_PARAMETER,
      collapseKey:
        GRAPH_COLLAPSE_KEY
          .RENDERING_PARAMETER,
      branch: "layouts",
      relationshipToParent: "related",
    });
  }

  return createDataTreeNonItemNode({
    treeNodeId,
    name: value
      ? `${name}: ${value}`
      : name,
    kind:
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
        .RENDERING_PARAMETER,
    collapseKey:
      GRAPH_COLLAPSE_KEY
        .RENDERING_PARAMETER,
    branch: "layouts",
    relationshipToParent: "related",
  });
}