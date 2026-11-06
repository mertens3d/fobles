import type { HistoryScope, HistoryVisit } from "../../../src/shared/item-history/item-history.types.ts";

export type HistoryStorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

export type HistorySitesProbeProps = { scope: HistoryScope | null };

export type HistoryDiscoveryProbe = {
  error: boolean;
  validations: { scope: HistoryScope; path: string }[];
  visits: { scope: HistoryScope; visits: HistoryVisit[] }[];
};

export type HistorySitesBundle = typeof import("../../../src/content/item-history/item-history-manager.ts") &
  typeof import("../../../src/content/toolbar/history/history-trigger.tsx") &
  typeof import("../../../src/content/toolbar/history/use-history-known-sites.ts") & {
    discovery: HistoryDiscoveryProbe;
  };