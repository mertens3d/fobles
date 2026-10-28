// @source-path [fobles] src/content/foundation/reference-data/model/rendering-reference-model-builder.ts

import { CONST } from "../../../../constants/const";
import { isGuidLike } from "../../sitecore/guid";
import { GRAPH_COLLAPSE_KEY } from "./graph-collapse.types";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { createSitecoreItemProvenance, createSyntheticProvenance } from "./reference-model-provenance.types";
import { createReferenceModelNodeId } from "./layout-reference-model-builder";
import type { ReferenceModelItemNode, ReferenceModelNode, ReferenceModelNonItemNode } from "./reference-model.types";
import { factoryItemGraphNodeData, type ItemGraphNodeData, type ScControl } from "./sitecore-item.types";

export function createRenderingReferenceModelNode(pageLayoutTreeNodeId: string, control: ScControl, controlIndex: number): ReferenceModelItemNode {
  const rendering = control.rendering;
  const renderingTreeNodeId = createReferenceModelNodeId(pageLayoutTreeNodeId, "rendering", control.uid ?? rendering.scItemId ?? String(controlIndex));
  const children: ReferenceModelNode[] = [];

  if (control.datasource) children.push(createDatasourceReferenceModelNode(renderingTreeNodeId, control.datasource));

  const parameters = Object.entries(control.parameters).filter(([, value]) => isReferenceValue(value));

  if (parameters.length > 0) children.push(createRenderingParametersReferenceModelNode(renderingTreeNodeId, parameters));

  return createReferenceModelItemNode({
    treeNodeId: renderingTreeNodeId,
    scItem: rendering,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.RENDERING,
    provenance: { type: "rendering-control", control },
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

function createDatasourceReferenceModelNode(renderingTreeNodeId: string, datasource: ItemGraphNodeData): ReferenceModelItemNode {
  return createReferenceModelItemNode({
    treeNodeId: createReferenceModelNodeId(renderingTreeNodeId, CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.DATASOURCE),
    scItem: datasource,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
    provenance: createSitecoreItemProvenance(datasource),
    collapseKey: GRAPH_COLLAPSE_KEY.DATASOURCE,
    branch: "layouts",
    relationshipToParent: "related",
  });
}

function createRenderingParametersReferenceModelNode(renderingTreeNodeId: string, parameters: Array<[string, string]>): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(renderingTreeNodeId, CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETERS);

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: "Rendering\nParameters",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    provenance: createSyntheticProvenance("Rendering Parameters"),
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS,
    branch: "layouts",
    relationshipToParent: "related",
    children: parameters.map(([name, value]) => createSingleParameterReferenceModelNode(name, value, treeNodeId)),
  });
}

function createSingleParameterReferenceModelNode(name: string, value: string, parametersTreeNodeId: string): ReferenceModelItemNode {
  const candidateValue = decodeURIComponent(value).trim();
  const scItem = isGuidLike(candidateValue)
    ? factoryItemGraphNodeData({ scItemId: candidateValue })
    : factoryItemGraphNodeData({ scItemPath: normalizeSitecorePath(candidateValue) });

  return createReferenceModelItemNode({
    treeNodeId: createReferenceModelNodeId(parametersTreeNodeId, CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETER, name),
    scItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.RENDERING_PARAMETER,
    provenance: { type: "rendering-parameter", parameterName: name, parameterValue: value, decodedValue: candidateValue, isItemReference: true },
    collapseKey: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER,
    branch: "layouts",
    relationshipToParent: "related",
  });
}

function isReferenceValue(value: string): boolean {
  const candidate = decodeURIComponent(value).trim();
  return isGuidLike(candidate) || isSitecorePath(candidate);
}

function isSitecorePath(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.startsWith("/sitecore/") || normalized.startsWith("sitecore/") || normalized.startsWith("local:");
}

function normalizeSitecorePath(value: string): string {
  return value.toLowerCase().startsWith("sitecore/") ? `/${value}` : value;
}
