import { normalizeHistoryScope } from "../../../../shared/item-history/item-history-model.ts";
import type { StructuralScope } from "../../../../shared/structural/structural.types.ts";
import { getRequestResult, runCacheTransaction } from "./indexed-db.ts";
import { serializeDatabasePrefix } from "./sitecore-data-cache-key.ts";
import type { SitecoreDataCacheFactRecord } from "./sitecore-data.types";

export async function invalidateStructuralCache(scope: StructuralScope, currentOrigin: string): Promise<void> {
  const normalized = normalizeHistoryScope(scope);
  if (normalized.origin !== new URL(currentOrigin).origin) {
    throw new TypeError("Structural cache origin does not match current origin");
  }
  const databasePrefix = serializeDatabasePrefix(normalized.database);
  await runCacheTransaction("readwrite", async (_, factStore) => {
    const facts = await getRequestResult(factStore.getAll()) as SitecoreDataCacheFactRecord[];
    for (const fact of facts) {
      if ((fact.factName === "templateBases" || fact.factName === "templateDerived") && fact.itemKey.startsWith(databasePrefix)) {
        await getRequestResult(factStore.delete(fact.key));
      }
    }
  });
}