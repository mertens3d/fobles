import type { ItemKind, StructuralKind } from "../../../../../shared/structural/structural.types.ts";

export type { ItemKind } from "../../../../../shared/structural/structural.types.ts";

export type BaseTemplateClassification = StructuralKind;

export type ClassificationDiagnostics = { matchedBaseTemplateClassifications: readonly StructuralKind[] };

export type TemplateIdentity = { id: string; path?: string };

export type TemplateInheritanceNode = {
  template: TemplateIdentity;
  depth: number;
  directBases: readonly TemplateInheritanceNode[];
  unresolved: boolean;
};

export type TemplateInheritanceWarning =
  { kind: "cycle-detected"; template: TemplateIdentity } | { kind: "limit-reached"; limit: number };

export type TemplateInheritanceGraph = {
  root: TemplateInheritanceNode;
  allTemplateIds: readonly string[];
  warnings: readonly TemplateInheritanceWarning[];
};

export type BaseTemplateIdSets = Record<StructuralKind, ReadonlySet<string>>;

export type ClassificationPathRoots = { content: string; templates: string };

export type ClassifyItemInput = {
  itemPath: string | undefined;
  inheritedTemplateIds: readonly string[];
  baseTemplateIds: BaseTemplateIdSets;
  pathRoots: ClassificationPathRoots;
};

export type ClassifyItemResult = { classification: ItemKind; diagnostics: ClassificationDiagnostics };

export type FetchDirectBaseTemplates = (template: TemplateIdentity) => Promise<readonly TemplateIdentity[] | undefined>;

export type AncestorWalkItem = { id: string; itemPath: string | undefined };

export type ClassifyAncestor = (item: AncestorWalkItem) => Promise<ItemKind>;

export type GetParentItem = (item: AncestorWalkItem) => Promise<AncestorWalkItem | undefined>;

export type FindNearestAncestorResult =
  | { outcome: "found"; item: AncestorWalkItem }
  | { outcome: "not-found" }
  | { outcome: "cycle-detected" }
  | { outcome: "limit-reached"; limit: number };

export type FetchStandardValues<T> = (templateId: string) => Promise<T | undefined>;

export type StandardValuesCandidate = { scItemName: string | undefined };