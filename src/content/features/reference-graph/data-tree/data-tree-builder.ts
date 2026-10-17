// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-builder.ts

import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";
import { createDataTreeNodeId } from "./layout-data-tree-builder";
import { createLayoutDataTree } from "./data-tree-node-id";
import { DATA_TREE_FAN_OUT_LIMITS } from "./data-tree-fan-out-limits";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import {
  createSitecoreItemProvenance,
  createSyntheticProvenance,
} from "./data-tree-provenance.types";
import type { DataTreeItemNode, DataTreeNonItemNode, DataTreeTruncation } from "./data-tree.types";
import { createSectionsTreeNode } from "./sections-data-tree-builder";

export function createDataTree(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode {
  const rootTreeNodeId = graphReferenceResult.rootItem.scItemId;

  const children = [
    createParentTreeNode(graphReferenceResult),
    createTemplateTreeNode(graphReferenceResult),
    createChildrenTreeNode(graphReferenceResult),
    createReferrersTreeNode(graphReferenceResult),
    createSectionsTreeNode(graphReferenceResult),
    createLayoutTreeNode(graphReferenceResult),
  ].filter(
    (treeNode): treeNode is DataTreeItemNode | DataTreeNonItemNode =>
      treeNode !== undefined,
  );

  return createDataTreeItemNode({
    treeNodeId: rootTreeNodeId,
    scItem: graphReferenceResult.rootItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ROOT,
    provenance: createSitecoreItemProvenance(graphReferenceResult.rootItem),
    relationshipToParent: "related",
    collapseKey: GRAPH_COLLAPSE_KEY.ROOT,
    children,
  });
}

function createParentTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode | undefined {
  const parent = graphReferenceResult.parent;

  let parentTreeNode: DataTreeItemNode | undefined = undefined;

  if (parent) {
    parentTreeNode = createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(
        graphReferenceResult.rootItem.scItemId,
        "parent",
      ),
      scItem: parent,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PARENT,
      provenance: createSitecoreItemProvenance(parent),
      collapseKey: GRAPH_COLLAPSE_KEY.PARENT,
      branch: "parent",
      relationshipToParent: "related",
      reverse: true,
    });
  }

  return parentTreeNode;
}

function createTemplateTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode | undefined {
  const template = graphReferenceResult.rootItem.scTemplate;

  let templateTreeNode: DataTreeItemNode | undefined = undefined;

  if (template) {
    templateTreeNode = createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(
        graphReferenceResult.rootItem.scItemId,
        "template",
      ),
      scItem: template,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
      provenance: createSitecoreItemProvenance(template),
      collapseKey: GRAPH_COLLAPSE_KEY.TEMPLATE,
      branch: "template",
      relationshipToParent: "related",
    });
  }

  return templateTreeNode;
}

function createChildrenTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const childItems = graphReferenceResult.childItems ?? [];

  let childrenTreeNode: DataTreeNonItemNode | undefined = undefined;

  if (childItems.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "children",
    );

    const truncation = createFanOutTruncation(
      childItems.length,
      DATA_TREE_FAN_OUT_LIMITS.MAX_CHILDREN_PER_ITEM,
    );

    const includedChildItems = childItems.slice(
      0,
      DATA_TREE_FAN_OUT_LIMITS.MAX_CHILDREN_PER_ITEM,
    );

    childrenTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name: "Children",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      provenance: createSyntheticProvenance("Children"),
      collapseKey: GRAPH_COLLAPSE_KEY.CHILDREN,
      branch: "children",
      relationshipToParent: "related",
      truncation,
      children: includedChildItems.map((childItem, index) =>
        createDataTreeItemNode({
          treeNodeId: createDataTreeNodeId(
            treeNodeId,
            childItem.scItemId,
            String(index),
          ),
          scItem: childItem,
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CHILD,
          provenance: createSitecoreItemProvenance(childItem),
          collapseKey: GRAPH_COLLAPSE_KEY.CHILD,
          branch: "children",
          relationshipToParent: "related",
        }),
      ),
    });
  }

  return childrenTreeNode;
}

function createReferrersTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const referrers = graphReferenceResult.referrers ?? [];

  // let referrersTreeNode: DataTreeNonItemNode | undefined = undefined;

  if (referrers.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "referrers",
    );

    const truncation = createFanOutTruncation(
      referrers.length,
      DATA_TREE_FAN_OUT_LIMITS.MAX_REFERRERS_PER_ITEM,
    );

    const includedReferrers = referrers.slice(
      0,
      DATA_TREE_FAN_OUT_LIMITS.MAX_REFERRERS_PER_ITEM,
    );

    const referrersTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name: "Referrers",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      provenance: createSyntheticProvenance("Referrers"),
      collapseKey: GRAPH_COLLAPSE_KEY.REFERRERS,
      branch: "referrers",
      relationshipToParent: "related",
      reverse: true,
      truncation,
      children: includedReferrers.map((referrer, index) =>
        createDataTreeItemNode({
          treeNodeId: createDataTreeNodeId(
            treeNodeId,
            referrer.scItemId,
            String(index),
          ),
          scItem: referrer,
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.REFERRER,
          provenance: createSitecoreItemProvenance(referrer),
          collapseKey: GRAPH_COLLAPSE_KEY.REFERRER,
          branch: "referrers",
          relationshipToParent: "related",
        }),
      ),
    });

    return referrersTreeNode;
  }
}

function createFanOutTruncation(
  availableCount: number,
  limit: number,
): DataTreeTruncation {
  return {
    availableCount,
    includedCount: Math.min(availableCount, limit),
    truncated: availableCount > limit,
  };
}
function createLayoutTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const hasLayoutData =
    (graphReferenceResult.layoutSectionFields?.length ?? 0) > 0;

  let layoutTreeNode: DataTreeNonItemNode | undefined = undefined;

  if (hasLayoutData) {
    layoutTreeNode = createLayoutDataTree(graphReferenceResult);
  }

  return layoutTreeNode;
}
