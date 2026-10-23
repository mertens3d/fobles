// @source-path [fobles] src/content/features/reference-graph/data-tree/sections-data-tree-builder.ts

import { CONST } from "../../../../constants/const";
import type {
  HarvestFieldLink,
  SitecoreHarvestField,
  SitecoreHarvestResult,
  SitecoreHarvestSection,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { createDataTreeItemNode, createDataTreeNonItemNode } from "./data-tree-node-factory";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../graph-nodes/graph-collapse.types";
import { createFieldReferenceProvenance, createSyntheticProvenance } from "./data-tree-provenance.types";
import type { DataTreeBranch, DataTreeNode, DataTreeNonItemNode } from "./data-tree.types";
import { createDataTreeNodeId } from "./layout-data-tree-builder";

export function createCustomFieldsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  return createFieldsCropTreeNode(
    graphReferenceResult,
    graphReferenceResult.customFieldSections,
    "Custom Fields",
    GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS,
    "customFields",
  );
}

export function createStandardFieldsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): DataTreeNonItemNode | undefined {
  return createFieldsCropTreeNode(
    graphReferenceResult,
    graphReferenceResult.standardFieldSections,
    "Standard Fields",
    GRAPH_COLLAPSE_KEY.STANDARD_FIELDS,
    "standardFields",
  );
}

// Fields and Standard Fields are two independent crops of the same section/field shape - each
// gets its own top-level group (own collapseKey/branch, so its filter/expand state is
// independent), sharing the section/field mapping below.
function createFieldsCropTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
  sections: readonly SitecoreHarvestSection[] | undefined,
  name: string,
  collapseKey: GraphCollapseKey,
  branch: DataTreeBranch,
): DataTreeNonItemNode | undefined {
  const populatedSections = sections?.filter((section) => section.fields.some((field) => Boolean(field.value))) ?? [];

  let cropTreeNode: DataTreeNonItemNode | undefined = undefined;

  if (populatedSections.length > 0) {
    const treeNodeId = createDataTreeNodeId(graphReferenceResult.rootItem.scItemId, branch);

    cropTreeNode = createDataTreeNonItemNode({
      treeNodeId,
      name,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
      provenance: createSyntheticProvenance(name),
      collapseKey,
      branch,
      relationshipToParent: "related",
      children: mapSections(populatedSections, treeNodeId, branch),
    });
  }

  return cropTreeNode;
}

function mapSections(
  sections: SitecoreHarvestSection[],
  treeNodeId: string,
  branch: DataTreeBranch,
): DataTreeNonItemNode[] {
  return sections.map((section, sectionIndex) => {
    const sectionTreeNodeId = createDataTreeNodeId(treeNodeId, "section", section.name, String(sectionIndex));

    return createDataTreeNonItemNode({
      treeNodeId: sectionTreeNodeId,
      name: section.name,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.SECTION,
      provenance: { type: "section", section },
      collapseKey: GRAPH_COLLAPSE_KEY.SECTION,
      branch,
      relationshipToParent: "related",
      children: mapSectionFields(sectionTreeNodeId, section.fields, section.name, branch),
    });
  });
}

function mapSectionFields(
  sectionTreeNodeId: string,
  fields: readonly SitecoreHarvestField[],
  sectionName: string,
  branch: DataTreeBranch,
): DataTreeNonItemNode[] {
  return fields
    .filter((field) => Boolean(field.value))
    .map((field, fieldIndex) => {
      const fieldTreeNodeId = createDataTreeNodeId(sectionTreeNodeId, "field", String(fieldIndex));

      return createDataTreeNonItemNode({
        treeNodeId: fieldTreeNodeId,
        name: field.value ?? "",
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
        provenance: { type: "section-field", fieldName: field.label, fieldValue: field.value ?? "", field },
        collapseKey: GRAPH_COLLAPSE_KEY.FIELD,
        branch,
        relationshipToParent: "related",
        children: mapFieldLinks(fieldTreeNodeId, field.links, sectionName, field.label, branch),
      });
    });
}

function mapFieldLinks(
  fieldTreeNodeId: string,
  fieldLinks: readonly HarvestFieldLink[],
  sectionName: string,
  fieldName: string,
  branch: DataTreeBranch,
): DataTreeNode[] {
  return dedupeFieldLinks(fieldLinks).map((fieldLink, linkIndex) =>
    createDataTreeItemNode({
      treeNodeId: createDataTreeNodeId(fieldTreeNodeId, fieldLink.valueItem.scItemId, String(linkIndex)),
      scItem: fieldLink.valueItem,
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ITEM,
      provenance: createFieldReferenceProvenance(
        fieldLink.valueItem,
        sectionName,
        fieldName,
        fieldLink.sourceValue,
        fieldLink.confidence,
        fieldLink.strategy,
      ),
      collapseKey: GRAPH_COLLAPSE_KEY.FIELD,
      branch,
      relationshipToParent: "related",
    }),
  );
}

// A field may resolve the same target through more than one raw occurrence (e.g. the generic
// GUID fallback scanning a value that repeats a GUID) - keep only the first reference per target.
function dedupeFieldLinks(fieldLinks: readonly HarvestFieldLink[]): HarvestFieldLink[] {
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
