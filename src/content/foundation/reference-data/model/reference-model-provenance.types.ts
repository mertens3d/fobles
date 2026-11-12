// @source-path [Fobles] src/content/foundation/reference-data/model/reference-model-provenance.types.ts

import type { ReferenceModelProvenance } from "./model.types.js";
import type { FoblesStrategy } from "../../../../constants/constants.types";
import type { FieldReferenceConfidence } from "../../../field-reference-resolution/field-reference-resolution.types";
import type { ItemGraphNodeData } from "./model.types";

export function createSitecoreItemProvenance(item: ItemGraphNodeData): ReferenceModelProvenance {
  return { type: "sitecore-item", item: { ...item } };
}

export function createSyntheticProvenance(label: string): ReferenceModelProvenance {
  return { type: "synthetic", label };
}

export function createFieldReferenceProvenance(
  item: ItemGraphNodeData,
  sectionName: string,
  fieldName: string,
  sourceValue: string,
  confidence: FieldReferenceConfidence,
  strategy: FoblesStrategy | undefined,
): ReferenceModelProvenance {
  return { type: "field-reference", item: { ...item }, sectionName, fieldName, sourceValue, confidence, strategy };
}
