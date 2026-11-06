import type { HistoryItem, HistoryScope } from "../../../src/shared/item-history/item-history.types.ts";
import type { KnownSite } from "../../../src/shared/structural/structural.types.ts";

export const MASTER: HistoryScope = { origin: "https://sitecore.example", database: "master" };

export const WEB: HistoryScope = { ...MASTER, database: "web" };

export const OTHER: HistoryScope = { origin: "https://other.example", database: "master" };

export const ITEM_ID = "00000000-0000-0000-0000-000000000001";

export const ROOT_ID = "00000000-0000-0000-0000-000000000002";

export const TEMPLATE_ID = "00000000-0000-0000-0000-000000000003";

export const ITEM: HistoryItem = {
  id: ITEM_ID, name: "Home", path: "/sitecore/content/Alpha/Home", category: "Content", lastVisitedAt: 1,
};

export const SITE: KnownSite = {
  id: ROOT_ID, name: "Alpha", path: "/sitecore/content/Alpha", templateId: TEMPLATE_ID, validatedAt: 0,
};