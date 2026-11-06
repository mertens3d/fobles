import type { HistoryScope, HistoryVisit } from "../item-history/item-history.types.ts";
import type { ITEM_KIND } from "./structural.const.ts";

export type ItemKind = typeof ITEM_KIND[keyof typeof ITEM_KIND];

export type StructuralKind = Exclude<ItemKind, "template" | "unknown">;

export type StructuralScope = HistoryScope;

export type StructuralVisit = HistoryVisit;

export type StructuralSettings = {
  baseTemplatePaths: Record<StructuralKind, readonly string[]>;
  showToolbarDiagnostics?: boolean;
};

export type KnownSite = HistoryVisit & { templateId: string; validatedAt: number };

export type KnownSitesChange =
  | { action: "upsert"; site: KnownSite }
  | { action: "remove"; id: string }
  | { action: "invalidate-validation" }
  | { action: "clear" };

export type KnownSitesResponse = { ok: true; sites: KnownSite[] } | { ok: false; error: string };