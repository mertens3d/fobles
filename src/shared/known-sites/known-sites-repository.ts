import { getStorageValue, onStorageChange } from "../storage/storage.ts";
import { normalizeHistoryScope } from "../item-history/item-history-model.ts";
import { KNOWN_SITES } from "../structural/structural.const.ts";
import type { KnownSite, KnownSitesChange, KnownSitesResponse, StructuralScope } from "../structural/structural.types.ts";
import { knownSitesStorageKey, normalizeKnownSites } from "./known-sites-model.ts";

export async function readKnownSites(scope: StructuralScope): Promise<KnownSite[]> {
  const key = knownSitesStorageKey(scope);
  const values = await getStorageValue([key], "local", true);
  return normalizeKnownSites(values[key]);
}

export function subscribeKnownSites(scope: StructuralScope, callback: (sites: KnownSite[]) => void): () => void {
  return onStorageChange(knownSitesStorageKey(scope), (value) => callback(normalizeKnownSites(value)), "local");
}

export async function mutateKnownSites(scope: StructuralScope, change: KnownSitesChange): Promise<KnownSite[]> {
  const response = await chrome.runtime.sendMessage<unknown, KnownSitesResponse>({
    type: KNOWN_SITES.CHANGE_MESSAGE, scope: normalizeHistoryScope(scope), change,
  });
  if (!response?.ok) {
    throw new Error(response && "error" in response ? response.error : "Known Sites writer unavailable");
  }
  return response.sites;
}