// @source-path [fobles] src/content/foundation/reference-data/processing/classification/item-classification.types.ts

export type ItemClassification = "template" | "tenant" | "site" | "page" | "other";

export type BaseTemplateClassification = Exclude<ItemClassification, "template" | "other">;

// Every base-template classification that matched, even though only the highest-precedence one
// becomes `classification` - callers can log this when more than one entry is present.
export type ClassificationDiagnostics = {
  matchedBaseTemplateClassifications: readonly BaseTemplateClassification[];
};

export type TemplateIdentity = { id: string; path?: string };

export type TemplateInheritanceNode = {
  template: TemplateIdentity;
  depth: number;
  directBases: readonly TemplateInheritanceNode[];
  // True when fetchDirectBaseTemplates could not resolve this template at all (missing/unresolvable).
  unresolved: boolean;
};

export type TemplateInheritanceWarning =
  | { kind: "cycle-detected"; template: TemplateIdentity }
  | { kind: "limit-reached"; limit: number };

export type TemplateInheritanceGraph = {
  root: TemplateInheritanceNode;
  // Normalized ids, in discovery (deterministic DFS) order - includes the root template.
  allTemplateIds: readonly string[];
  warnings: readonly TemplateInheritanceWarning[];
};

export type BaseTemplateIdSets = {
  page: ReadonlySet<string>;
  site: ReadonlySet<string>;
  tenant: ReadonlySet<string>;
};

export type ClassificationPathRoots = { content: string; templates: string };
