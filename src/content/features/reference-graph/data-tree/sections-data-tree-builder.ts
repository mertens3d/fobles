import { CONST } from "../../../../constants/const";
import type {
  HarvestFieldLink,
  SitecoreHarvestField,
  SitecoreHarvestResult,
  SitecoreHarvestSection,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  createDataTreeItemNode,
  createDataTreeNonItemNode,
} from "./data-tree-node-factory";
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";
import type {
  DataTreeNode,
  DataTreeNonItemNode,
} from "./data-tree.types";
import {
  createDataTreeNodeId,
} from "./layout-data-tree-builder";

export function createSectionsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const sections =
    graphReferenceResult.sections?.filter(
      (section) =>
        section.fields.some(
          (field) => Boolean(field.value),
        ),
    ) ?? [];

  let sectionsTreeNode:
    | DataTreeNonItemNode
    | undefined = undefined;

  if (sections.length > 0) {
    const treeNodeId = createDataTreeNodeId(
      graphReferenceResult.rootItem.scItemId,
      "sections",
    );

    sectionsTreeNode =
      createDataTreeNonItemNode({
        treeNodeId,
        name: "Sections",
        kind:
          CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
            .STRUCTURAL,
        collapseKey:
          GRAPH_COLLAPSE_KEY.SECTIONS,
        branch: "sections",
        relationshipToParent: "related",
        children: mapSections(
          sections,
          treeNodeId,
        ),
      });
  }

  return sectionsTreeNode;
}

function mapSections(
  sections: SitecoreHarvestSection[],
  treeNodeId: string,
): DataTreeNonItemNode[] {
  return sections.map(
    (section, sectionIndex) => {
      const sectionTreeNodeId =
        createDataTreeNodeId(
          treeNodeId,
          "section",
          section.name,
          String(sectionIndex),
        );

      return createDataTreeNonItemNode({
        treeNodeId: sectionTreeNodeId,
        name: section.name,
        kind:
          CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
            .SECTION,
        collapseKey:
          GRAPH_COLLAPSE_KEY.SECTION,
        branch: "sections",
        relationshipToParent: "related",
        children: mapSectionFields(
          sectionTreeNodeId,
          section.fields,
        ),
      });
    },
  );
}

function mapSectionFields(
  sectionTreeNodeId: string,
  fields: readonly SitecoreHarvestField[],
): DataTreeNonItemNode[] {
  return fields
    .filter((field) => Boolean(field.value))
    .map((field, fieldIndex) => {
      const fieldTreeNodeId =
        createDataTreeNodeId(
          sectionTreeNodeId,
          "field",
          String(fieldIndex),
        );

      return createDataTreeNonItemNode({
        treeNodeId: fieldTreeNodeId,
        name: field.value ?? "",
        kind:
          CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
            .FIELD,
        collapseKey:
          GRAPH_COLLAPSE_KEY.FIELD,
        branch: "sections",
        relationshipToParent: "related",
        children: mapFieldLinks(
          fieldTreeNodeId,
          field.links,
        ),
      });
    });
}

function mapFieldLinks(
  fieldTreeNodeId: string,
  fieldLinks: readonly HarvestFieldLink[],
): DataTreeNode[] {
  return fieldLinks.map(
    (fieldLink, linkIndex) =>
      createDataTreeItemNode({
        treeNodeId: createDataTreeNodeId(
          fieldTreeNodeId,
          fieldLink.valueItem.scItemId,
          String(linkIndex),
        ),
        scItem: fieldLink.valueItem,
        kind:
          CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND
            .FIELD,
        collapseKey:
          GRAPH_COLLAPSE_KEY.FIELD,
        branch: "sections",
        relationshipToParent: "related",
      }),
  );
}