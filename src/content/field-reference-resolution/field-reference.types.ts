// @source-path [fobles] src/content/field-reference-resolution/field-reference.types.ts

import type { FoblesStrategy } from "../features/augmentor/fobles.types";

export type FieldReferenceConfidence = "strategy" | "inferred";

// One resolved Sitecore item reference found inside a single field's value. "strategy" means a
// known Fobles field strategy identified this value as item-addressable (it may still fail to
// resolve to a real item - not-found doesn't mean it wasn't an expected Sitecore reference).
// "inferred" means no strategy claimed the field and this GUID was found generically in the raw
// value instead.
export type FieldReference = {
  target: string;
  confidence: FieldReferenceConfidence;
  strategy?: FoblesStrategy;
  sourceValue: string;
};

export type FieldReferenceResolution = {
  displayValue: string | undefined;
  references: readonly FieldReference[];
};
