// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-node-factory.ts

import { CONST } from "../../../../constants/const";
import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../graph-nodes/graph-collapse.types";
import type { DataTreeProvenance } from "./data-tree-provenance.types";
import type {
  DataTreeBranch,
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
  DataTreeTruncation,
  RelationshipToParent,
} from "./data-tree.types";
import { createDataTreeNodeId } from "./layout-data-tree-builder";
import type { PlaceholderTreeNode } from "./data-tree.types";
import { createRenderingDataTreeNode } from "./rendering-data-tree-builder";

type DataTreeNodeOptions = {
  treeNodeId: string;
  kind: DataTreeNode["kind"];
  collapseKey: GraphCollapseKey;
  provenance: DataTreeProvenance;
  branch?: DataTreeBranch;
  relationshipToParent: RelationshipToParent;
  reverse?: boolean;
  truncation?: DataTreeTruncation;
  children?: DataTreeNode[];
};

type DataTreeItemNodeOptions =
  DataTreeNodeOptions & {
    scItem: ItemGraphNodeData;
  };

type DataTreeNonItemNodeOptions =
  DataTreeNodeOptions & {
    name: string;
  };

export function createDataTreeItemNode({
  treeNodeId,
  kind,
  collapseKey,
  provenance,
  branch,
  relationshipToParent,
  reverse,
  truncation,
  children = [],
  scItem,
}: DataTreeItemNodeOptions): DataTreeItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem,
    kind,
    collapseKey,
    provenance,
    branch,
    relationshipToParent,
    reverse,
    truncation,
    children,
  };
}

function createPlaceholderDataTreeNode(
  pageLayoutTreeNodeId: string,
  placeholder: PlaceholderTreeNode,
): DataTreeNonItemNode {
  const placeholderSegments = placeholder.path.split("/");
  const placeholderName =
    placeholderSegments[placeholderSegments.length - 1] ??
    placeholder.path;
  const children: DataTreeNode[] = [];

  placeholder.placeholders.forEach((childPlaceholder) => {
    children.push(
      createPlaceholderDataTreeNode(
        pageLayoutTreeNodeId,
        childPlaceholder,
      ),
    );
  });

  placeholder.controls.forEach((control, controlIndex) => {
    children.push(
      createRenderingDataTreeNode(
        pageLayoutTreeNodeId,
        control,
        controlIndex,
      ),
    );
  });

  return createDataTreeNonItemNode({
    treeNodeId: createDataTreeNodeId(
      pageLayoutTreeNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    name: placeholderName,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PLACEHOLDER,
    provenance: {
      type: "placeholder",
      placeholderPath: placeholder.path,
      displayName: placeholderName,
      rawData: placeholder.controls.map(
        (control) => control.rawData,
      ),
    },
    collapseKey: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

export function createDataTreeNonItemNode({
  treeNodeId,
  kind,
  collapseKey,
  provenance,
  branch,
  relationshipToParent,
  reverse,
  truncation,
  children = [],
  name,
}: DataTreeNonItemNodeOptions): DataTreeNonItemNode {
  return {
    treeNodeId,
    nodeType: "nonItem",
    name,
    kind,
    collapseKey,
    provenance,
    branch,
    relationshipToParent,
    reverse,
    truncation,
    children,
  };
}