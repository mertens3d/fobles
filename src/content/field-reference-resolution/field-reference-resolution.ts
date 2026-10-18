// @source-path [fobles] src/content/field-reference-resolution/field-reference-resolution.ts

import { extractAllGuids } from "./field-reference-guid";
import { KNOWN_FIELD_REFERENCE_RESOLVERS } from "./field-reference-resolvers";
import type { FieldReference, FieldReferenceResolution } from "./field-reference.types";

// A known strategy wins even when it returns no references. Generic GUID inference runs only when
// no known strategy claims the field. Friendly strategy labels are preferred for graph display;
// sourceValue continues to preserve the raw stored field value.
export function resolveFieldReferences(marker: HTMLElement, rawValue: string | undefined): FieldReferenceResolution {
  const strategyReferences = resolveKnownStrategyReferences(marker);
  const references = strategyReferences ?? resolveInferredReferences(rawValue);

  return {
    displayValue: resolveFriendlyDisplayValue(references) ?? rawValue,
    references,
  };
}

function resolveKnownStrategyReferences(marker: HTMLElement): FieldReference[] | undefined {
  for (const resolver of KNOWN_FIELD_REFERENCE_RESOLVERS) {
    const references = resolver(marker);
    if (references !== undefined) return references;
  }

  return undefined;
}

function resolveFriendlyDisplayValue(references: readonly FieldReference[]): string | undefined {
  const labels = references
    .map((reference) => reference.label?.trim())
    .filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(", ") : undefined;
}

function resolveInferredReferences(rawValue: string | undefined): FieldReference[] {
  if (!rawValue) return [];

  return extractAllGuids(rawValue).map((guid) => ({
    target: guid,
    confidence: "inferred",
    sourceValue: rawValue,
  }));
}