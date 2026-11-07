// @source-path [fobles] src/shared/item-history/item-history-model.ts

import { ITEM_HISTORY, ITEM_HISTORY_PATH_ROOTS } from "./item-history.const.ts";
import type { HistoryCategory, HistoryChange, HistoryItem, HistoryScope, HistoryVisit } from "./item-history.types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathWithin(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

function isHistoryCategory(value: unknown): boolean {
  return typeof value === "string" &&
    ITEM_HISTORY.CATEGORIES.some((category) => category.toLowerCase() === value.toLowerCase());
}

function normalizePath(value: unknown): string | undefined {
  let path: string | undefined;
  if (typeof value === "string") {
    const candidate = value.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/+$/, "");
    const segments = candidate.split("/");
    if (isPathWithin(candidate.toLowerCase(), ITEM_HISTORY_PATH_ROOTS.ROOT) &&
      !segments.some((segment) => segment === "." || segment === "..") &&
      !Array.from(candidate).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
      path = candidate;
    }
  }
  return path;
}

/** Returns a lowercase dashed GUID without braces, or undefined for invalid input. */
export function normalizeHistoryId(value: unknown): string | undefined {
  let id: string | undefined;
  if (typeof value === "string") {
    const candidate = value.trim();
    const unbraced = candidate.startsWith("{") && candidate.endsWith("}") ? candidate.slice(1, -1) : candidate;
    if (/^(?:[\da-f]{32}|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.test(unbraced)) {
      const compact = unbraced.replace(/-/g, "").toLowerCase();
      id = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
    }
  }
  return id;
}

/** Classifies case-insensitive root/descendant paths; every other path is Content. */
export function classifyHistoryPath(path: string): HistoryCategory {
  const normalized = (normalizePath(path) ?? "").toLowerCase();
  let category: HistoryCategory = "Content";
  if (isPathWithin(normalized, ITEM_HISTORY_PATH_ROOTS.MEDIA_LIBRARY)) {
    category = "Media Library";
  } else if (isPathWithin(normalized, ITEM_HISTORY_PATH_ROOTS.TEMPLATES)) {
    category = "Templates";
  } else if (isPathWithin(normalized, ITEM_HISTORY_PATH_ROOTS.LAYOUT)) {
    category = "Layout";
  } else if (isPathWithin(normalized, ITEM_HISTORY_PATH_ROOTS.SYSTEM)) {
    category = "System";
  }
  return category;
}

/** Validates visit metadata, trimming names and canonicalizing GUIDs and Sitecore paths. */
export function normalizeHistoryVisit(value: unknown): HistoryVisit {
  const id = isRecord(value) ? normalizeHistoryId(value.id) : undefined;
  const name = isRecord(value) && typeof value.name === "string" ? value.name.trim() : "";
  const path = isRecord(value) ? normalizePath(value.path) : undefined;
  if (!id || !name || !path) {
    throw new TypeError("Invalid item history visit");
  }
  return { id, name, path };
}

/** Validates HTTP(S) origins and nonempty databases; discards URL paths, queries and language. */
export function normalizeHistoryScope(value: unknown): HistoryScope {
  if (!isRecord(value) || typeof value.origin !== "string" || typeof value.database !== "string") {
    throw new TypeError("Invalid item history scope");
  }
  const url = new URL(value.origin.trim());
  const database = value.database.trim().toLowerCase();
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !database) {
    throw new TypeError("Item history requires an HTTP(S) origin and database");
  }
  return { origin: url.origin, database };
}

/** Builds an origin-and-database key; ports are retained and language never participates. */
export function historyStorageKey(scope: HistoryScope): string {
  const normalized = normalizeHistoryScope(scope);
  return `${ITEM_HISTORY.STORAGE_KEY_PREFIX}${encodeURIComponent(normalized.origin)}:${encodeURIComponent(normalized.database)}`;
}

/** Validates a change and removes all caller-supplied timestamps and unrelated properties. */
export function normalizeHistoryChange(value: unknown): HistoryChange {
  let change: HistoryChange;
  if (isRecord(value) && value.action === "visit") {
    change = { action: "visit", visit: normalizeHistoryVisit(value.visit) };
  } else if (isRecord(value) && value.action === "remove") {
    const id = normalizeHistoryId(value.id);
    if (!id) {
      throw new TypeError("Invalid item history removal ID");
    }
    change = { action: "remove", id };
  } else if (isRecord(value) && value.action === "clear") {
    change = { action: "clear" };
  } else {
    throw new TypeError("Invalid item history change");
  }
  return change;
}

/** Drops invalid rows; derives categories from paths and retains the newest metadata per GUID, capped at 20. */
export function normalizeHistoryItems(value: unknown): HistoryItem[] {
  const items: HistoryItem[] = [];
  if (Array.isArray(value)) {
    for (const entry of value as unknown[]) {
      if (isRecord(entry) && typeof entry.lastVisitedAt === "number" &&
        Number.isFinite(entry.lastVisitedAt) && entry.lastVisitedAt >= 0 &&
        isHistoryCategory(entry.category)) {
        try {
          const visit = normalizeHistoryVisit(entry);
          items.push({ ...visit, category: classifyHistoryPath(visit.path), lastVisitedAt: entry.lastVisitedAt });
        } catch {
          continue;
        }
      }
    }
  }
  items.sort((left, right) => right.lastVisitedAt - left.lastVisitedAt);
  const seen = new Set<string>();
  return limitHistoryItems(items.filter((item) => {
    const unique = !seen.has(item.id);
    seen.add(item.id);
    return unique;
  }));
}

function limitHistoryItems(items: readonly HistoryItem[]): HistoryItem[] {
  const counts = new Map<HistoryCategory, number>();
  return items.filter((item) => {
    const count = counts.get(item.category) ?? 0;
    const limit = ITEM_HISTORY.MAX_ITEMS_BY_CATEGORY[item.category];
    const include = count < limit;
    if (include) {
      counts.set(item.category, count + 1);
    }
    return include;
  });
}

/** Replaces visit metadata and moves the item to the front using a finite nonnegative writer timestamp. */
export function upsertHistoryItem(history: unknown, visit: HistoryVisit, time: number): HistoryItem[] {
  const normalized = normalizeHistoryVisit(visit);
  if (!Number.isFinite(time) || time < 0) {
    throw new TypeError("Invalid item history timestamp");
  }
  const item: HistoryItem = { ...normalized, category: classifyHistoryPath(normalized.path), lastVisitedAt: time };
  return limitHistoryItems([item, ...normalizeHistoryItems(history).filter((entry) => entry.id !== item.id)]);
}