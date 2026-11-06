import { normalizeHistoryId, normalizeHistoryScope } from "../../../../shared/item-history/item-history-model.ts";
import type { StructuralScope } from "../../../../shared/structural/structural.types.ts";
import type { SitecoreDataCacheKey } from "./sitecore-data-cache.types.ts";

export function structuralTemplateCacheKey(scope: StructuralScope, templateId: string): SitecoreDataCacheKey {
  const normalized = normalizeHistoryScope(scope);
  const id = normalizeHistoryId(templateId);
  if (!id) {
    throw new TypeError("Invalid structural template ID");
  }
  return { environment: normalized.origin, database: normalized.database, language: "", item: { kind: "id", value: id } };
}