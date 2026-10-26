// @source-path [fobles] src/content/foundation/reference-data/model/rendering-reference-model-builder.ts

import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import { isGuidLike } from "../../sitecore/guid";
import { GRAPH_COLLAPSE_KEY } from "../../../features/reference-graph/graph-nodes/graph-collapse.types";
import {
  createReferenceModelItemNode,
  createReferenceModelNonItemNode,
} from "./reference-model-node-factory";
import {
  createSyntheticProvenance,
} from "./reference-model-provenance.types";
import { createReferenceModelNodeId } from "./layout-reference-model-builder";
import type {
  ReferenceModelItemNode,
  ReferenceModelNode,
  ReferenceModelNonItemNode,
} from "./reference-model.types";
import { factoryItemGraphNodeData, type ItemGraphNodeData, type ScControl } from "./sitecore-item.types";

export function createRenderingReferenceModelNode(
  pageLayoutTreeNodeId: string,
  control: ScControl,
  controlIndex: number,
): ReferenceModelItemNode {
  const rendering = control.rendering;
  const renderingTreeNodeId = createReferenceModelNodeId(
    pageLayoutTreeNodeId,
    "rendering",
    control.uid ?? rendering.scItemId ?? String(controlIndex),
  );
  const children: ReferenceModelNode[] = [];

  if (control.datasource) {
    children.push(
      createDatasourceReferenceModelNode(
        renderingTreeNodeId,
        control.datasource,
        control,
      ),
    );
  }

  const parameters = Object.entries(control.parameters);

  if (parameters.length > 0) {
    children.push(
      createRenderingParametersReferenceModelNode(
        renderingTreeNodeId,
        parameters,
        control,
      ),
    );
  }

  return createReferenceModelItemNode({
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

function createDatasourceReferenceModelNode(
  renderingTreeNodeId: string,
  datasource: ItemGraphNodeData,
  control: ScControl,
): ReferenceModelItemNode {
  return createReferenceModelItemNode({
    treeNodeId: createReferenceModelNodeId(
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

function createRenderingParametersReferenceModelNode(
  renderingTreeNodeId: string,
  parameters: Array<[string, string]>,
  control: ScControl,
): ReferenceModelNonItemNode {
  return createReferenceModelNonItemNode({
    treeNodeId: createReferenceModelNodeId(
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
      createSingleParameterReferenceModelNode(
        name,
        value,
        renderingTreeNodeId,
        control,
      ),
    ),
  });
}

function createSingleParameterReferenceModelNode(
  name: string,
  value: string,
  renderingTreeNodeId: string,
  control: ScControl,
): ReferenceModelNode {
  const treeNodeId = createReferenceModelNodeId(
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
    return createReferenceModelItemNode({
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

  return createReferenceModelNonItemNode({
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