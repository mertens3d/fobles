// @source-path [fobles] src/content/features/reference-graph/reference-model/reference-model-builder.ts

import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../constants/const";
import { GRAPH_COLLAPSE_KEY } from "../reference-graph/graph-nodes/graph-collapse.types";
import { createReferenceModelNodeId } from "./layout-reference-model-builder";
import { createLayoutReferenceModel } from "./reference-model-node-id";
import { REFERENCE_MODEL_FAN_OUT_LIMITS } from "./reference-model-fan-out-limits";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { createSitecoreItemProvenance, createSyntheticProvenance } from "./reference-model-provenance.types";
import type { ReferenceModelItemNode, ReferenceModelNonItemNode, ReferenceModelTruncation } from "./reference-model.types";
import { createCustomFieldsTreeNode, createStandardFieldsTreeNode } from "./sections-reference-model-builder";


export function createReferenceModel(
  graphReferenceResult: SitecoreHarvestResult,
  filters: SitecoreHarvestFiltersState,
): ReferenceModelItemNode {
  const rootTreeNodeId = graphReferenceResult.rootItem.scItemId;

  const children = [
    createParentTreeNode(graphReferenceResult),
    createTemplateTreeNode(graphReferenceResult),
    createChildrenTreeNode(graphReferenceResult),
    createReferrersTreeNode(graphReferenceResult),
    filters.customFields ? createCustomFieldsTreeNode(graphReferenceResult) : undefined,
    filters.standardFields ? createStandardFieldsTreeNode(graphReferenceResult) : undefined,
    createLayoutTreeNode(graphReferenceResult),
  ].filter((treeNode): treeNode is ReferenceModelItemNode | ReferenceModelNonItemNode => treeNode !== undefined);

  const rootTreeNode = createReferenceModelItemNode({
    treeNodeId: rootTreeNodeId,
    scItem: graphReferenceResult.rootItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ROOT,
    provenance: createSitecoreItemProvenance(graphReferenceResult.rootItem),
    relationshipToParent: "related",
    collapseKey: GRAPH_COLLAPSE_KEY.ROOT,
    children,
  });


  return rootTreeNode;
}

function createParentTreeNode(graphReferenceResult: SitecoreHarvestResult): ReferenceModelItemNode | undefined {
  const parent = graphReferenceResult.parent;

  let parentTreeNode: ReferenceModelItemNode | undefined = undefined;

  if (parent) {
    parentTreeNode = createReferenceModelItemNode({
      treeNodeId: createReferenceModelNodeId(graphReferenceResult.rootItem.scItemId, "parent"),
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

function createTemplateTreeNode(graphReferenceResult: SitecoreHarvestResult): ReferenceModelItemNode | undefined {
  const template = graphReferenceResult.rootItem.scTemplate;

  let templateTreeNode: ReferenceModelItemNode | undefined = undefined;

  if (template) {
    templateTreeNode = createReferenceModelItemNode({
      treeNodeId: createReferenceModelNodeId(graphReferenceResult.rootItem.scItemId, "template"),
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

function createChildrenTreeNode(graphReferenceResult: SitecoreHarvestResult): ReferenceModelNonItemNode | undefined {
  const childItems = graphReferenceResult.childItems ?? [];

  let childrenTreeNode: ReferenceModelNonItemNode | undefined = undefined;

  if (childItems.length > 0) {
    const treeNodeId = createReferenceModelNodeId(graphReferenceResult.rootItem.scItemId, "children");

    const truncation = createFanOutTruncation(childItems.length, REFERENCE_MODEL_FAN_OUT_LIMITS.MAX_CHILDREN_PER_ITEM);

    const includedChildItems = childItems.slice(0, REFERENCE_MODEL_FAN_OUT_LIMITS.MAX_CHILDREN_PER_ITEM);

    childrenTreeNode = createReferenceModelNonItemNode({
      treeNodeId,
      name: "Children",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      provenance: createSyntheticProvenance("Children"),
      collapseKey: GRAPH_COLLAPSE_KEY.CHILDREN,
      branch: "children",
      relationshipToParent: "related",
      truncation,
      children: includedChildItems.map((childItem, index) =>
        createReferenceModelItemNode({
          treeNodeId: createReferenceModelNodeId(treeNodeId, childItem.scItemId, String(index)),
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

function createReferrersTreeNode(graphReferenceResult: SitecoreHarvestResult): ReferenceModelNonItemNode | undefined {
  const referrers = graphReferenceResult.referrers ?? [];
  if (referrers.length > 0) {
    const treeNodeId = createReferenceModelNodeId(graphReferenceResult.rootItem.scItemId, "referrers");

    const truncation = createFanOutTruncation(referrers.length, REFERENCE_MODEL_FAN_OUT_LIMITS.MAX_REFERRERS_PER_ITEM);

    const includedReferrers = referrers.slice(0, REFERENCE_MODEL_FAN_OUT_LIMITS.MAX_REFERRERS_PER_ITEM);

    const referrersTreeNode = createReferenceModelNonItemNode({
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
        createReferenceModelItemNode({
          treeNodeId: createReferenceModelNodeId(treeNodeId, referrer.scItemId, String(index)),
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

function createFanOutTruncation(availableCount: number, limit: number): ReferenceModelTruncation {
  return { availableCount, includedCount: Math.min(availableCount, limit), truncated: availableCount > limit };
}
function createLayoutTreeNode(graphReferenceResult: SitecoreHarvestResult): ReferenceModelNonItemNode | undefined {
  const hasLayoutData = (graphReferenceResult.layoutSectionFields?.length ?? 0) > 0;

  let layoutTreeNode: ReferenceModelNonItemNode | undefined = undefined;

  if (hasLayoutData) {
    layoutTreeNode = createLayoutReferenceModel(graphReferenceResult);
  }

  return layoutTreeNode;
}
