// @source-path [fobles] src/content/foundation/reference-data/model/reference-model-provenance.ts

import type { ReferenceModelProvenance } from "./model.types.ts";
import type { FoblesStrategy } from "../../../../constants/constants.types.js";
import type { FieldReferenceConfidence } from "../../../field-reference-resolution/field-reference-resolution.types.js";
import type { ItemGraphNodeData } from "./model.types.ts";

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
