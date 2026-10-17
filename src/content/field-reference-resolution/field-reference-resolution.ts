// @source-path [fobles] src/content/field-reference-resolution/field-reference-resolution.ts

import { extractAllGuids } from "./field-reference-guid";
import { KNOWN_FIELD_REFERENCE_RESOLVERS } from "./field-reference-resolvers";
import type { FieldReference, FieldReferenceResolution } from "./field-reference.types";

// Single entry point: try every known strategy resolver against the field's own marker; the
// first one whose shape matches wins, even if it claims zero references. Only when NO known
// strategy claims the field at all does every distinct GUID in the raw value become an inferred
// reference instead - never both for the same field. displayValue stays the field's own raw
// stored value either way - each reference gets its own child node (and its own resolved name
// once enriched), so the field node doesn't need to re-derive a friendlier summary from them.
export function resolveFieldReferences(
  marker: HTMLElement,
  rawValue: string | undefined,
): FieldReferenceResolution {
  const strategyReferences = resolveKnownStrategyReferences(marker);

  return {
    displayValue: rawValue,
    references: strategyReferences ?? resolveInferredReferences(rawValue),
  };
}

function resolveKnownStrategyReferences(marker: HTMLElement): FieldReference[] | undefined {
  for (const resolver of KNOWN_FIELD_REFERENCE_RESOLVERS) {
    const references = resolver(marker);

    if (references) {
      return references;
    }
  }

  return undefined;
}

function resolveInferredReferences(rawValue: string | undefined): FieldReference[] {
  if (!rawValue) {
    return [];
  }

  return extractAllGuids(rawValue).map((guid) => ({
    target: guid,
    confidence: "inferred",
    sourceValue: rawValue,
  }));
}
