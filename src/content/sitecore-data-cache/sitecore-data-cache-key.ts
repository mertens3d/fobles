// @source-path [fobles] src/content/sitecore-data-cache/sitecore-data-cache-key.ts

import type { SitecoreItemLocator } from "../foundation/workers/tasks/worker-task.types";
import type { SitecoreDataCacheKey } from "./sitecore-data-cache.types";

// Not a Sitecore-legal character in an environment name, database name, language code, or GUID -
// safe to join normalized parts with, and to use as a stable serialized-key boundary.
const KEY_SEPARATOR = "::";

// Exported so callers filtering/comparing identity values (e.g. listItems) can normalize the
// same way the serialized key already does, instead of relying on whatever casing was stored.
export function normalizeIdentityPart(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeGuid(value: string): string {
  return value.replace(/[{}]/g, "").trim().toLowerCase();
}

// Collapses accidental repeated separators (e.g. a trailing-slash parent joined with a leading-
// slash child) without inventing a case-insensitivity rule no existing Fobles behavior supports.
function normalizePath(value: string): string {
  return value.trim().replace(/\/{2,}/g, "/");
}

export function normalizeItemLocator(item: SitecoreItemLocator): SitecoreItemLocator {
  return item.kind === "id"
    ? { kind: "id", value: normalizeGuid(item.value) }
    : { kind: "path", value: normalizePath(item.value) };
}

// GUID and path identities are never merged: itemKind is part of the serialized key, so an "id"
// locator and a "path" locator can never collide even if their raw string values coincided.
export function serializeCacheKey(key: SitecoreDataCacheKey): string {
  const item = normalizeItemLocator(key.item);

  return [
    normalizeIdentityPart(key.environment),
    normalizeIdentityPart(key.database),
    normalizeIdentityPart(key.language),
    item.kind,
    item.value,
  ].join(KEY_SEPARATOR);
}
