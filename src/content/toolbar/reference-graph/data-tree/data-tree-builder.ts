// @source-path [fobles] src/content/toolbar/reference-graph/data-tree/data-tree-builder.ts

import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { CONST } from "../../../../constants/const";
import {
  createLayoutDataTree,
  createDataTreeNodeId,
} from "./layout-data-tree-builder";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import type {
  DataTreeItemNode,
  DataTreeNonItemNode,
} from "./data-tree.types";

export function createDataTree(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode {
  const rootTreeNodeId =
    graphReferenceResult.rootItem.scItemId;

  const children = [
    createParentTreeNode(graphReferenceResult),
    createTemplateTreeNode(graphReferenceResult),
    createChildrenTreeNode(graphReferenceResult),
    createReferrersTreeNode(graphReferenceResult),
    createSectionsTreeNode(graphReferenceResult),
    createLayoutTreeNode(graphReferenceResult),
  ].filter(
    (
      treeNode,
    ): treeNode is
      | DataTreeItemNode
      | DataTreeNonItemNode =>
      treeNode !== undefined,
  );

  return createDataTreeItemNode({
    treeNodeId: rootTreeNodeId,
    scItem: graphReferenceResult.rootItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ITEM,
    children,
  });
}

function createParentTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode | undefined {
  const parent = graphReferenceResult.parent;

  let parentTreeNode:
    | DataTreeItemNode
    | undefined = undefined;

  if (parent) {
    parentTreeNode = createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(
        graphReferenceResult.rootItem.scItemId,
        "parent",
      ),
      scItem: parent,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PARENT,
      branch: "parent",
      relationshipToParent: "related",
    });
  }

  return parentTreeNode;
}

function createTemplateTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeItemNode | undefined {
  const template =
    graphReferenceResult.rootItem.scTemplate;

  let templateTreeNode:
    | DataTreeItemNode
    | undefined = undefined;

  if (template) {
    templateTreeNode = createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(
        graphReferenceResult.rootItem.scItemId,
        "template",
      ),
      scItem: template,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
      branch: "template",
      relationshipToParent: "related",
    });
  }

  return templateTreeNode;
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

    childrenTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name: "Children",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      branch: "children",
      relationshipToParent: "related",
      children: childItems.map((childItem, index) =>
        createDataTreeItemNode({
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
    });
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

    referrersTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name: "Referrers",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      branch: "referrers",
      relationshipToParent: "related",
      reverse: true,
      children: referrers.map((referrer, index) =>
        createDataTreeItemNode({
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
    });
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

    sectionsTreeNode = createDataTreeNonItemNode({
      treeNodeId,
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

        return createDataTreeNonItemNode({
          treeNodeId: sectionTreeNodeId,
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

              return createDataTreeNonItemNode({
                treeNodeId: fieldTreeNodeId,
                name: field.value ?? "",
                kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
                branch: "sections",
                children: (field.links ?? []).map(
                  (fieldLink, linkIndex) =>
                    createDataTreeItemNode({
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
              });
            }),
        });
      }),
    });
  }

  return sectionsTreeNode;
}

function createLayoutTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const hasLayoutData =
    (graphReferenceResult.layoutSectionFields?.length ?? 0) >
    0;

  let layoutTreeNode:
    | DataTreeNonItemNode
    | undefined = undefined;

  if (hasLayoutData) {
    layoutTreeNode =
      createLayoutDataTree(graphReferenceResult);
  }

  return layoutTreeNode;
}