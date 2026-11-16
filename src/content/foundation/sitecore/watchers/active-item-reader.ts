// @source-path [fobles] src/content/foundation/sitecore/watchers/active-item-reader.ts

import { normalizeHistoryScope, normalizeHistoryVisit } from "../../../../shared/item-history/item-history-model.ts";
import type { HistoryScope, HistoryVisit } from "../../../../shared/item-history/item-history.types.ts";
import { resolveSitecoreDataIdentity } from "../data/sitecore-data-identity.ts";
import { getQuickInfo } from "../quick-info.ts";
import type { SitecoreDocumentSnapshot } from "./watchers.types.ts";

export function readHistoryVisit(doc: Document): HistoryVisit | undefined {
  let visit: HistoryVisit | undefined;
  try {
    const quickInfo = getQuickInfo(doc);
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

// Agent: Never throws. Sitecore markup is external and may be partial mid-AJAX; an unresolved scope is reported as
// Agent: scopeError so every subscriber decides for itself, and a missing/invalid Quick Info yields no visit.
export function readSitecoreDocumentSnapshot(doc: Document): SitecoreDocumentSnapshot {
  const visit = readHistoryVisit(doc);
  let snapshot: SitecoreDocumentSnapshot;
  try {
    snapshot = { scope: resolveHistoryScope(doc), visit };
  } catch (error) {
    snapshot = { scopeError: error, visit };
  }
  return snapshot;
}
