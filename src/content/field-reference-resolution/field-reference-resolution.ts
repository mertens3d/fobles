import { CONST } from "../../constants/const.ts";
import { extractAllGuids } from "./field-reference-guid.ts";
import { KNOWN_FIELD_REFERENCE_RESOLVERS } from "./field-reference-resolvers.ts";
import type { FieldReference, FieldReferenceResolution } from "./field-reference.types";

// A known strategy wins even when it returns no references. Generic GUID inference runs only when
// no known strategy claims the field. Friendly strategy labels are preferred for graph display;
// sourceValue continues to preserve the raw stored field value.
export function resolveFieldReferences(
  marker: HTMLElement,
  rawValue: string | undefined,
  fieldLabel: string,
): FieldReferenceResolution {
  const strategyReferences = resolveKnownStrategyReferences(marker);
  const references =
    strategyReferences ??
    resolveInferredReferences(rawValue, fieldLabel);

  return {
    displayValue: resolveFriendlyDisplayValue(references) ?? rawValue,
    references,
  };
}

function resolveKnownStrategyReferences(
  marker: HTMLElement,
): FieldReference[] | undefined {
  let references: FieldReference[] | undefined;

  for (const resolver of KNOWN_FIELD_REFERENCE_RESOLVERS) {
    const resolved = resolver(marker);

    if (resolved !== undefined && references === undefined) {
      references = resolved;
    }
  }

  return references;
}

function resolveFriendlyDisplayValue(
  references: readonly FieldReference[],
): string | undefined {
  const labels = references
    .map((reference) => reference.label?.trim())
    .filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(", ") : undefined;
}

function resolveInferredReferences(
  rawValue: string | undefined,
  fieldLabel: string,
): FieldReference[] {
  let references: FieldReference[] = [];

  if (rawValue) {
    const normalizedFieldLabel = normalizeFieldLabel(fieldLabel);

    if (
      !CONST.SITECORE.HARVEST.NON_REFERENCE_GUID_FIELD_LABELS_LC.has(
        normalizedFieldLabel,
      )
    ) {
      references = extractAllGuids(rawValue).map((guid) => ({
        target: guid,
        confidence: "inferred",
        sourceValue: rawValue,
      }));
    }
  }

  return references;
}

function normalizeFieldLabel(fieldLabel: string): string {
  return fieldLabel
    .trim()
    .replace(/:+$/, "")
    .trim()
    .toLowerCase();
}