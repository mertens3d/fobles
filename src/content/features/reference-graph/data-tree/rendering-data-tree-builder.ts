// @source-path [fobles] src/content/features/reference-graph/data-tree/rendering-data-tree-builder.ts

import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import {
  factoryItemGraphNodeData,
  type ItemGraphNodeData,
  type ScControl,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  isGuidLike,
} from "../../augmentor/shared/guid";
import {
  GRAPH_COLLAPSE_KEY,
} from "../graph-nodes/graph-collapse.types";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import {
  createDataTreeNodeId,
} from "./layout-data-tree-builder";
import type {
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
} from "./data-tree.types";

export function createRenderingDataTreeNode(
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