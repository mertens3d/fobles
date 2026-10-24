import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import type { DataTreeNode } from "../data-tree/data-tree.types";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "../lifecycle/processing-state";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "./graph-collapse.types";
import { kindClass } from "./graph-helpers";
import { resolveNodeLabel } from "./node-label-resolver";
import { NODE_PRESENTATION_BY_KIND } from "./node-presentation";
import type { GraphNodeData } from "./graph-node.types";
import { getGraphPresentationState } from "./graph-presentation-state";
import { iconForProcessingState } from "./processing-icon";
export const COMPOUND_GROUP_CLASS = "fobles-reference-graph-compound-group";
export const INVISIBLE_COMPOUND_GROUP_CLASS = "fobles-reference-graph-compound-group--invisible";

type CompoundGroupDefinition = {
  idSuffix: string;
  rootCollapseKey: GraphCollapseKey;
  memberCollapseKeys: readonly GraphCollapseKey[];
  includeMemberDescendants?: boolean;
};

type AppendGraphNodeOptions = {
  semanticParentTreeNodeId?: string;
  compoundParentNodeId?: string;
  propagateCompoundParent?: boolean;
};

const COMPOUND_GROUP_DEFINITIONS: readonly CompoundGroupDefinition[] = [
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.CHILDREN,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.CHILD,
    ],
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.RENDERING,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.DATASOURCE,
      GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS,
    ],
    includeMemberDescendants: true,
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.PLACEHOLDER,
      GRAPH_COLLAPSE_KEY.RENDERING,
    ],
    includeMemberDescendants: true,
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.LAYOUTS,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.LAYOUT_SECTION,
    ],
    includeMemberDescendants: true,
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.SECTION,
    ],
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.STANDARD_FIELDS,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.SECTION,
    ],
  },
  {
    idSuffix: "group",
    rootCollapseKey: GRAPH_COLLAPSE_KEY.SECTION,
    memberCollapseKeys: [
      GRAPH_COLLAPSE_KEY.FIELD,
    ],
    includeMemberDescendants: true,
  },
];

export type ProjectedGraphNode = { data: GraphNodeData; classes: string[] };

export function getGraphOwnedClasses(): string[] {
  const kindClasses = Object.keys(NODE_PRESENTATION_BY_KIND).map(kindClass);
  const filterClasses: string[] = Object.values(CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS);

  return [...kindClasses, ...filterClasses];
}

export function appendGraphNode(
  treeNode: DataTreeNode,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
  semanticParentTreeNodeId?: string,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId = new Map(),
): void {
  appendGraphNodeInternal(treeNode, cytoNodes, cytoEdges, { semanticParentTreeNodeId }, processingStateByTreeNodeId);
}

function appendGraphNodeInternal(
  treeNode: DataTreeNode,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
  options: AppendGraphNodeOptions,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
): void {
  const { semanticParentTreeNodeId, compoundParentNodeId, propagateCompoundParent = false } = options;

  const groupDefinition = findCompoundGroupDefinition(treeNode);
  const groupId = groupDefinition ? `${treeNode.treeNodeId}-${groupDefinition.idSuffix}` : undefined;

  if (groupDefinition && groupId) {
    cytoNodes.push(createCompoundGroupElement(treeNode, groupId, compoundParentNodeId));
  }

  const projectedNode = projectGraphNode(treeNode, semanticParentTreeNodeId, processingStateByTreeNodeId.get(treeNode.treeNodeId));

  if (groupId) {
    projectedNode.data.parent = groupId;
  } else if (compoundParentNodeId) {
    projectedNode.data.parent = compoundParentNodeId;
  }

  cytoNodes.push({ data: projectedNode.data, classes: projectedNode.classes.join(" ") });

  appendRelationshipEdge(treeNode, semanticParentTreeNodeId, cytoEdges);

  treeNode.children.forEach((childTreeNode) => {
    const isDirectGroupMember =
      groupDefinition !== undefined &&
      groupId !== undefined &&
      groupDefinition.memberCollapseKeys.includes(getGraphPresentationState(childTreeNode).collapseKey);

    let childCompoundParentNodeId: string | undefined;
    let childPropagateCompoundParent = false;

    if (isDirectGroupMember && groupId && groupDefinition) {
      childCompoundParentNodeId = groupId;
      childPropagateCompoundParent = groupDefinition.includeMemberDescendants === true;
    } else if (propagateCompoundParent && compoundParentNodeId) {
      childCompoundParentNodeId = compoundParentNodeId;
      childPropagateCompoundParent = true;
    }

    appendGraphNodeInternal(childTreeNode, cytoNodes, cytoEdges, {
      semanticParentTreeNodeId: treeNode.treeNodeId,
      compoundParentNodeId: childCompoundParentNodeId,
      propagateCompoundParent: childPropagateCompoundParent,
    }, processingStateByTreeNodeId);
  });
}

function appendRelationshipEdge(
  treeNode: DataTreeNode,
  semanticParentTreeNodeId: string | undefined,
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  const { kind, relationshipToParent = "contained", reverse = false } = getGraphPresentationState(treeNode);

  if (semanticParentTreeNodeId && relationshipToParent === "related") {
    cytoEdges.push({
      data: reverse
        ? {
          id: `edge-${treeNode.treeNodeId}-${semanticParentTreeNodeId}`,
          source: treeNode.treeNodeId,
          target: semanticParentTreeNodeId,
        }
        : {
          id: `edge-${semanticParentTreeNodeId}-${treeNode.treeNodeId}`,
          source: semanticParentTreeNodeId,
          target: treeNode.treeNodeId,
        },
    });
  }
}

function findCompoundGroupDefinition(treeNode: DataTreeNode): CompoundGroupDefinition | undefined {
  return COMPOUND_GROUP_DEFINITIONS.find(
    (definition) =>
      definition.rootCollapseKey === getGraphPresentationState(treeNode).collapseKey &&
      treeNode.children.some((childTreeNode) => definition.memberCollapseKeys.includes(getGraphPresentationState(childTreeNode).collapseKey)),
  );
}

function createCompoundGroupElement(
  treeNode: DataTreeNode,
  groupId: string,
  parentGroupId?: string,
): cytoscape.ElementDefinition {
  return {
    group: "nodes",
    data: {
      id: groupId,
      parent: parentGroupId,
      label: "",
      childTreeNodeIds: [treeNode.treeNodeId, ...treeNode.children.map((childTreeNode) => childTreeNode.treeNodeId)],
      expandable: false,
      collapseKey: getGraphPresentationState(treeNode).collapseKey,
      compoundGroup: true,
    },
    classes: [COMPOUND_GROUP_CLASS, getFilterClass(treeNode)]
      .filter((className): className is string => Boolean(className))
      .join(" "),
    selectable: false,
    grabbable: false,
    pannable: true,
  };
}
export function projectGraphNode(treeNode: DataTreeNode, parentTreeNodeId?: string, processingStatus?: ProcessingStatus): ProjectedGraphNode {
  const { kind, relationshipToParent = "contained", reverse = false } = getGraphPresentationState(treeNode);
  const renderingParameter = treeNode.provenance.type === "rendering-parameter" ? treeNode.provenance : undefined;
  const itemIcon = treeNode.nodeType === "item" ? treeNode.scItem.scItemIcon : undefined;

  const graphNodeData: GraphNodeData = {
    id: treeNode.treeNodeId,
    parentTreeNodeId,
    parent: relationshipToParent === "contained" ? parentTreeNodeId : undefined,
    label: resolveNodeLabel(treeNode, NODE_PRESENTATION_BY_KIND[kind], kind),
    childTreeNodeIds: treeNode.children.map((childTreeNode) => childTreeNode.treeNodeId),
    expandable: treeNode.children.length > 0,
    collapseKey: getGraphPresentationState(treeNode).collapseKey,
    itemId: treeNode.nodeType === "item" ? treeNode.scItem.scItemId : undefined,
    path: treeNode.nodeType === "item" ? treeNode.scItem.scItemPath : undefined,
    link: treeNode.nodeType === "item" ? treeNode.scItem.link : undefined,
    drillDown: treeNode.nodeType === "item" ? Boolean(treeNode.scItem.link) : false,
    icon: treeNode.nodeType === "item" ? iconForProcessingState(processingStatus, itemIcon) : undefined,
    renderingParameterValue: renderingParameter?.parameterValue,
    renderingParameterIsItemReference: renderingParameter?.isItemReference,
    enrichmentStatus: treeNode.nodeType === "item" ? processingStatus : undefined,
  };

  const classes = [kindClass(kind), getFilterClass(treeNode)].filter(
    (className): className is string => Boolean(className),
  );

  return { data: graphNodeData, classes };
}


function getFilterClass(treeNode: DataTreeNode): string | undefined {
  let filterClass: string | undefined;

  const { branch } = getGraphPresentationState(treeNode);
  if (branch) filterClass = CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS[branch];

  return filterClass;
}