// @source-path [fobles] src/content/features/reference-model/sections-reference-model-builder.ts

import { CONST } from "../../../constants/const";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../reference-graph/graph-nodes/graph-collapse.types";
import { createFieldReferenceProvenance, createSyntheticProvenance } from "./reference-model-provenance.types";
import type { ReferenceModelBranch, ReferenceModelNode, ReferenceModelNonItemNode } from "./reference-model.types";
import { createReferenceModelNodeId } from "./layout-reference-model-builder";
import type { SitecoreHarvestSection, SitecoreHarvestField, HarvestFieldLink } from "./sitecore-item.types";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";

export function createCustomFieldsTreeNode(
  graphReferenceResult: SitecoreHarvestResult,
): ReferenceModelNonItemNode | undefined {
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
): ReferenceModelNonItemNode | undefined {
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
  branch: ReferenceModelBranch,
): ReferenceModelNonItemNode | undefined {
  const populatedSections = sections?.filter((section) => section.fields.some((field) => Boolean(field.value))) ?? [];

  let cropTreeNode: ReferenceModelNonItemNode | undefined = undefined;

  if (populatedSections.length > 0) {
    const treeNodeId = createReferenceModelNodeId(graphReferenceResult.rootItem.scItemId, branch);

    cropTreeNode = createReferenceModelNonItemNode({
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
  branch: ReferenceModelBranch,
): ReferenceModelNonItemNode[] {
  return sections.map((section, sectionIndex) => {
    const sectionTreeNodeId = createReferenceModelNodeId(treeNodeId, "section", section.name, String(sectionIndex));

    return createReferenceModelNonItemNode({
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
  branch: ReferenceModelBranch,
): ReferenceModelNonItemNode[] {
  return fields
    .filter((field) => Boolean(field.value))
    .map((field, fieldIndex) => {
      const fieldTreeNodeId = createReferenceModelNodeId(sectionTreeNodeId, "field", String(fieldIndex));

      return createReferenceModelNonItemNode({
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
  branch: ReferenceModelBranch,
): ReferenceModelNode[] {
  return dedupeFieldLinks(fieldLinks).map((fieldLink, linkIndex) =>
    createReferenceModelItemNode({
      treeNodeId: createReferenceModelNodeId(fieldTreeNodeId, fieldLink.valueItem.scItemId, String(linkIndex)),
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
