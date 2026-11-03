// @source-path [fobles] src/content/item-history/quick-info.ts

import { normalizeHistoryScope, normalizeHistoryVisit } from "../../shared/item-history/item-history-model.ts";
import type { HistoryScope, HistoryVisit } from "../../shared/item-history/item-history.types.ts";
import { resolveSitecoreDataIdentity } from "../foundation/sitecore/data/sitecore-data-identity.ts";
import { getQuickInfo } from "../foundation/sitecore/quick-info.ts";

export function readHistoryVisit(doc: Document): HistoryVisit | undefined {
  let visit: HistoryVisit | undefined;
  const quickInfo = getQuickInfo(doc);
  try {
    visit = normalizeHistoryVisit({ id: quickInfo.itemId, name: quickInfo.itemName, path: quickInfo.itemPath });
  } catch {
    visit = undefined;
  }
  return visit;
}

export function resolveHistoryScope(doc: Document): HistoryScope {
  const identity = resolveSitecoreDataIdentity(doc);
  return normalizeHistoryScope({ origin: identity.environment, database: identity.database });
}