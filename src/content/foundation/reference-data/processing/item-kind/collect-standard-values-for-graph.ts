import { stripGuidBraces } from "../../../sitecore/guid.ts";
import type { FetchStandardValues, TemplateInheritanceGraph } from "./item-kind.types.ts";

export type { FetchStandardValues } from "./item-kind.types.ts";

export async function collectStandardValuesForTemplateGraph<T>(
  graph: TemplateInheritanceGraph,
  fetchStandardValues: FetchStandardValues<T>,
  includeInheritedTemplates: boolean,
): Promise<ReadonlyMap<string, T | undefined>> {
  const ids = includeInheritedTemplates ? graph.allTemplateIds : [stripGuidBraces(graph.root.template.id).toLowerCase()];
  return new Map(await Promise.all(ids.map(async (id): Promise<readonly [string, T | undefined]> => {
    let value: T | undefined;
    try {
      value = await fetchStandardValues(id);
    } catch {
      value = undefined;
    }
    return [id, value];
  })));
}