import { CONST } from "../../../../constants/const";
import type {
  HarvestFieldLink,
  SitecoreHarvestField,
  SitecoreHarvestResult,
  SitecoreHarvestSection,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {  createDataTreeItemNode, createDataTreeNonItemNode,} from "./data-tree-node-factory";
import { GRAPH_COLLAPSE_KEY } from "../graph-nodes/graph-collapse.types";
import {
  createFieldReferenceProvenance,
  createSyntheticProvenance,
} from "./data-tree-provenance.types";
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
        provenance: createSyntheticProvenance("Sections"),
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
        provenance: { type: "section", section },
        collapseKey:
          GRAPH_COLLAPSE_KEY.SECTION,
        branch: "sections",
        relationshipToParent: "related",
        children: mapSectionFields(
          sectionTreeNodeId,
          section.fields,
          section.name,
        ),
      });
    },
  );
}

function mapSectionFields(
  sectionTreeNodeId: string,
  fields: readonly SitecoreHarvestField[],
  sectionName: string,
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
        provenance: {
          type: "section-field",
          fieldName: field.label,
          fieldValue: field.value ?? "",
          field,
        },
        collapseKey:
          GRAPH_COLLAPSE_KEY.FIELD,
        branch: "sections",
        relationshipToParent: "related",
        children: mapFieldLinks(
          fieldTreeNodeId,
          field.links,
          sectionName,
          field.label,
        ),
      });
    });
}

function mapFieldLinks(
  fieldTreeNodeId: string,
  fieldLinks: readonly HarvestFieldLink[],
  sectionName: string,
  fieldName: string,
): DataTreeNode[] {
  return dedupeFieldLinks(fieldLinks).map(
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
            .ITEM,
        provenance: createFieldReferenceProvenance(
          fieldLink.valueItem,
          sectionName,
          fieldName,
          fieldLink.sourceValue,
          fieldLink.confidence,
          fieldLink.strategy,
        ),
        collapseKey:
          GRAPH_COLLAPSE_KEY.FIELD,
        branch: "sections",
        relationshipToParent: "related",
      }),
  );
}

// A field may resolve the same target through more than one raw occurrence (e.g. the generic
// GUID fallback scanning a value that repeats a GUID) - keep only the first reference per target.
function dedupeFieldLinks(
  fieldLinks: readonly HarvestFieldLink[],
): HarvestFieldLink[] {
  const seenTargets = new Set<string>();

  return fieldLinks.filter((fieldLink) => {
    const target = fieldLink.target.toLowerCase();

    if (seenTargets.has(target)) {
      return false;
    }

    seenTargets.add(target);
    return true;
  });
}