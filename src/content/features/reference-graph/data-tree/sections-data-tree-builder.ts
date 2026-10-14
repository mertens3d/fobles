import { CONST } from "../../../../constants/const";
import type { HarvestFieldLink, SitecoreHarvestField, SitecoreHarvestResult, SitecoreHarvestSection } from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  createDataTreeNonItemNode,
  createDataTreeItemNode,
} from "./data-tree-node-factory";
import type { DataTreeNonItemNode } from "./data-tree.types";
import { createDataTreeNodeId } from "./layout-data-tree-builder";

export function createSectionsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  const sections =
    graphReferenceResult.sections?.filter((section) =>
      section.fields.some((field) => Boolean(field.value)),
    ) ?? [];

  let sectionsTreeNode: DataTreeNonItemNode | undefined = undefined;

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
      children: mapSections(sections, treeNodeId),
    });
  }

  return sectionsTreeNode;
}

const mapSections = (
  sections: SitecoreHarvestSection[],
  treeNodeId: string,
) => {
  return sections.map((section, sectionIndex) => {
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
      relationshipToParent: "related",
      children: mapSectionFields(sectionTreeNodeId, section.fields),
    });
  });
};

const mapSectionFields = (
  sectionTreeNodeId: string,
  fields: readonly SitecoreHarvestField[],
) => {
  return (fields ?? [])
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
        relationshipToParent: "related",
        children: mapFieldLinks(fieldTreeNodeId, field.links),
      });
    });
};

const mapFieldLinks = (
  fieldTreeNodeId: string,
  fieldLinks: readonly HarvestFieldLink[],
) => {
  return (fieldLinks ?? []).map((fieldLink, linkIndex) =>
    createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(
        fieldTreeNodeId,
        fieldLink.valueItem.scItemId,
        String(linkIndex),
      ),
      scItem: fieldLink.valueItem,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
      branch: "sections",
      relationshipToParent: "related",
    }),
  );
};
