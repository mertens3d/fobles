// @source-path [fobles] src/content/foundation/reference-data/processing/classification/collect-standard-values-for-graph.ts

import { stripGuidBraces } from "../../../sitecore/guid.ts";
import type { TemplateInheritanceGraph } from "./item-classification.types.ts";

export type FetchStandardValues<T> = (templateId: string) => Promise<T | undefined>;

function normalizeId(id: string): string {
  return stripGuidBraces(id).toLowerCase();
}

// When includeInheritedTemplates is false, only the graph's own root template is looked up -
// Standard Values must not trigger a full inheritance traversal on its own. One failing fetch
// (rejected promise) never prevents the other templates' Standard Values from being collected.
export async function collectStandardValuesForTemplateGraph<T>(
  graph: TemplateInheritanceGraph,
  fetchStandardValues: FetchStandardValues<T>,
  includeInheritedTemplates: boolean,
): Promise<ReadonlyMap<string, T | undefined>> {
  const templateIds = includeInheritedTemplates ? graph.allTemplateIds : [normalizeId(graph.root.template.id)];

  const entries = await Promise.all(
    templateIds.map(async (templateId): Promise<readonly [string, T | undefined]> => {
      try {
        return [templateId, await fetchStandardValues(templateId)];
      } catch {
        return [templateId, undefined];
      }
    }),
  );

  return new Map(entries);
}
