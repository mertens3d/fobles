// @source-path [Fobles] src/content/toolbar/reference-graph/components/data-builders/reference-tree-builder.ts

import type {
  ItemGraphNodeData,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import {
  createLayoutDataTree,
  createDataTreeNodeId,
} from "./layout-data-tree-builder";
import type {
  DataTreeBranch,
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
} from "./data-tree.types";

export function createDataTree(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode {
  const rootTreeNodeId =
    graphReferenceResult.rootItem.scItemId;

  const children: DataTreeNode[] = [];

  if (graphReferenceResult.parent) {
    children.push(
      createItemTreeNode({
        treeNodeId: createDataTreeNodeId(
          rootTreeNodeId,
          "parent",
        ),
        scItem: graphReferenceResult.parent,
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PARENT,
        branch: "parent",
        relationshipToParent: "related",
      }),
    );
  }

  if (graphReferenceResult.rootItem.scTemplate) {
    children.push(
      createItemTreeNode({
        treeNodeId: createDataTreeNodeId(
          rootTreeNodeId,
          "template",
        ),
        scItem: graphReferenceResult.rootItem.scTemplate,
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
        branch: "template",
        relationshipToParent: "related",
      }),
    );
  }

  const childrenTreeNode =
    createChildrenTreeNode(graphReferenceResult);

  if (childrenTreeNode) {
    children.push(childrenTreeNode);
  }

  const referrersTreeNode =
    createReferrersTreeNode(graphReferenceResult);

  if (referrersTreeNode) {
    children.push(referrersTreeNode);
  }

  const sectionsTreeNode =
    createSectionsTreeNode(graphReferenceResult);

  if (sectionsTreeNode) {
    children.push(sectionsTreeNode);
  }

  if (
    (graphReferenceResult.layoutSectionFields?.length ?? 0) > 0
  ) {
    children.push(
      createLayoutDataTree(graphReferenceResult),
    );
  }

  return {
    treeNodeId: rootTreeNodeId,
    nodeType: "item",
    scItem: graphReferenceResult.rootItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ITEM,
    children,
  };
}

function createChildrenTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const childItems =
    graphReferenceResult.childItems ?? [];

  let childrenTreeNode:
    | DataTreeNonItemNode
    | undefined = undefined;

  if (childItems.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "children",
    );

    childrenTreeNode = {
      treeNodeId,
      nodeType: "nonItem",
      name: "Children",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      branch: "children",
      relationshipToParent: "related",
      children: childItems.map((childItem, index) =>
        createItemTreeNode({
          treeNodeId: createDataTreeNodeId(
            treeNodeId,
            childItem.scItemId,
            String(index),
          ),
          scItem: childItem,
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CHILD,
          branch: "children",
        }),
      ),
    };
  }

  return childrenTreeNode;
}

function createReferrersTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const referrers =
    graphReferenceResult.referrers ?? [];

  let referrersTreeNode:
    | DataTreeNonItemNode
    | undefined = undefined;

  if (referrers.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "referrers",
    );

    referrersTreeNode = {
      treeNodeId,
      nodeType: "nonItem",
      name: "Referrers",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      branch: "referrers",
      relationshipToParent: "related",
      reverse: true,
      children: referrers.map((referrer, index) =>
        createItemTreeNode({
          treeNodeId: createDataTreeNodeId(
            treeNodeId,
            referrer.scItemId,
            String(index),
          ),
          scItem: referrer,
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.REFERRER,
          branch: "referrers",
        }),
      ),
    };
  }

  return referrersTreeNode;
}

function createSectionsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const sections =
    graphReferenceResult.sections?.filter((section) =>
      section.fields.some((field) => Boolean(field.value)),
    ) ?? [];

  let sectionsTreeNode:
    | DataTreeNonItemNode
    | undefined = undefined;

  if (sections.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "sections",
    );

    sectionsTreeNode = {
      treeNodeId,
      nodeType: "nonItem",
      name: "Sections",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      branch: "sections",
      relationshipToParent: "related",
      children: sections.map((section, sectionIndex) => {
        const sectionTreeNodeId = createDataTreeNodeId(
          treeNodeId,
          "section",
          section.name,
          String(sectionIndex),
        );

        return {
          treeNodeId: sectionTreeNodeId,
          nodeType: "nonItem",
          name: section.name,
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.SECTION,
          branch: "sections",
          children: section.fields
            .filter((field) => Boolean(field.value))
            .map((field, fieldIndex) => {
              const fieldTreeNodeId = createDataTreeNodeId(
                sectionTreeNodeId,
                "field",
                String(fieldIndex),
              );

              return {
                treeNodeId: fieldTreeNodeId,
                nodeType: "nonItem",
                name: field.value ?? "",
                kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
                branch: "sections",
                children: (field.links ?? []).map(
                  (fieldLink, linkIndex) =>
                    createItemTreeNode({
                      treeNodeId: createDataTreeNodeId(
                        fieldTreeNodeId,
                        fieldLink.valueItem.scItemId,
                        String(linkIndex),
                      ),
                      scItem: fieldLink.valueItem,
                      kind:
                        CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
                        branch: "sections",
                      relationshipToParent: "related",
                    }),
                ),
              } satisfies DataTreeNonItemNode;
            }),
        } satisfies DataTreeNonItemNode;
      }),
    };
  }

  return sectionsTreeNode;
}

type CreateItemTreeNodeOptions = {
  treeNodeId: string;
  scItem: ItemGraphNodeData;
  kind: DataTreeItemNode["kind"];
  branch?: DataTreeBranch;
  relationshipToParent?: DataTreeItemNode["relationshipToParent"];
  reverse?: boolean;
  children?: DataTreeNode[];
};

function createItemTreeNode({
  treeNodeId,
  scItem,
  kind,
  branch,
  relationshipToParent,
  reverse,
  children = [],
}: CreateItemTreeNodeOptions): DataTreeItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem,
    kind,
    branch,
    relationshipToParent,
    reverse,
    children,
  };
}