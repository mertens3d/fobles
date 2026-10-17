// @source-path [fobles] src/content/features/reference-graph/data-tree/rendering-data-tree-builder.ts

import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import {
  factoryItemGraphNodeData,
  type ItemGraphNodeData,
  type ScControl,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { isGuidLike } from "../../augmentor/shared/guid";
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import {
  createSitecoreItemProvenance,
  createSyntheticProvenance,
} from "./data-tree-provenance.types";
import { createDataTreeNodeId } from "./layout-data-tree-builder";
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
  const renderingTreeNodeId = createDataTreeNodeId(
    pageLayoutTreeNodeId,
    "rendering",
    control.uid ?? rendering.scItemId ?? String(controlIndex),
  );
  const children: DataTreeNode[] = [];

  if (control.datasource) {
    children.push(
      createDatasourceDataTreeNode(
        renderingTreeNodeId,
        control.datasource,
        control,
      ),
    );
  }

  const parameters = Object.entries(control.parameters);

  if (parameters.length > 0) {
    children.push(
      createRenderingParametersDataTreeNode(
        renderingTreeNodeId,
        parameters,
        control,
      ),
    );
  }

  return createDataTreeItemNode({
    treeNodeId: renderingTreeNodeId,
    scItem: rendering,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.RENDERING,
    provenance: {
      type: "rendering-control",
      control,
    },
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createDatasourceDataTreeNode(
  renderingTreeNodeId: string,
  datasource: ItemGraphNodeData,
  control: ScControl,
): DataTreeItemNode {
  return createDataTreeItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.DATASOURCE,
    ),
    scItem: datasource,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
    provenance: {
      type: "sitecore-item",
      item: { ...datasource },
      rawData: {
        "s:ds": control.rawData["s:ds"],
      },
    },
    collapseKey: GRAPH_COLLAPSE_KEY.DATASOURCE,
    branch: "layouts",
    relationshipToParent: "related",
  });
}

function createRenderingParametersDataTreeNode(
  renderingTreeNodeId: string,
  parameters: Array<[string, string]>,
  control: ScControl,
): DataTreeNonItemNode {
  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      renderingTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETERS,
    ),
    name: "Rendering\nParameters",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    provenance: createSyntheticProvenance("Rendering Parameters"),
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS,
    branch: "layouts",
    relationshipToParent: "related",
    children: parameters.map(([name, value]) =>
      createSingleParameterDataTreeNode(
        name,
        value,
        renderingTreeNodeId,
        control,
      ),
    ),
  });
}

function createSingleParameterDataTreeNode(
  name: string,
  value: string,
  renderingTreeNodeId: string,
  control: ScControl,
): DataTreeNode {
  const treeNodeId = createDataTreeNodeId(
    renderingTreeNodeId,
    CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETER,
    name,
  );
  const candidateValue = decodeURIComponent(value);

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
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.RENDERING_PARAMETER,
      provenance: {
        type: "rendering-parameter",
        parameterName: name,
        parameterValue: value,
        decodedValue: candidateValue,
        isItemReference: true,
        rawData: {
          "s:par": control.rawData["s:par"],
        },
      },
      collapseKey: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER,
      branch: "layouts",
      relationshipToParent: "related",
    });
  }

  return createDataTreeNonItemNode({
    treeNodeId,
    name: value ? `${name}: ${value}` : name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.RENDERING_PARAMETER,
    provenance: {
      type: "rendering-parameter",
      parameterName: name,
      parameterValue: value,
      decodedValue: candidateValue,
      isItemReference: false,
      rawData: {
        "s:par": control.rawData["s:par"],
      },
    },
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER,
    branch: "layouts",
    relationshipToParent: "related",
  });
}