// @source-path [fobles] src/shared/item-history/item-history.types.ts

export type HistoryCategory = "Content" | "Media Library" | "Templates" | "Layout" | "System";

export type HistoryItem = {
  id: string;
  name: string;
  path: string;
  category: HistoryCategory;
  lastVisitedAt: number;
};

export type HistoryScope = {
  origin: string;
  database: string;
};

export type HistoryVisit = {
  id: string;
  name: string;
  path: string;
};

export type HistoryChange =
  | { action: "visit"; visit: HistoryVisit }
  | { action: "remove"; id: string }
  | { action: "clear" };

export type HistoryChangeMessage = {
  type: "FOBLES_ITEM_HISTORY_CHANGE";
  scope: HistoryScope;
  change: HistoryChange;
};

export type HistoryChangeResponse =
  | { ok: true; history: HistoryItem[] }
  | { ok: false; error: string };