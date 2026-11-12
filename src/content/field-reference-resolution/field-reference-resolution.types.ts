import type { FoblesStrategy } from "../../constants/constants.types";

export type FieldReferenceResolver = (marker: HTMLElement) => FieldReference[] | undefined;

export type FieldReferenceConfidence = "strategy" | "inferred";

export type FieldReference = {
  target: string;
  label?: string;
  confidence: FieldReferenceConfidence;
  strategy?: FoblesStrategy;
  sourceValue: string;
};

export type FieldReferenceResolution = { displayValue: string | undefined; references: readonly FieldReference[] };
