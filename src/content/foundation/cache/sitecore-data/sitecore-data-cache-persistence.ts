// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache-persistence.ts
import { SITECORE_DATA_CACHE } from "../../../../constants/sitecore-data-cache.const.ts";

const NON_PERSISTED_KEYS: ReadonlySet<string> = new Set(SITECORE_DATA_CACHE.NON_PERSISTED_KEYS);
const ORIGIN_RELATIVE_KEYS: ReadonlySet<string> = new Set(SITECORE_DATA_CACHE.ORIGIN_RELATIVE_KEYS);

function resolveOrigin(environment: string): string | undefined {
  let origin: string | undefined;
  try {
    origin = new URL(environment.trim()).origin.toLowerCase();
  } catch {
    // AI NOTE: Not every environment value is a URL (tests use "DEV"). Those have no origin to strip.
    origin = undefined;
  }
  return origin === "null" ? undefined : origin;
}

function makeOriginRelative(text: string, origin: string | undefined): string {
  let result = text;
  if (origin !== undefined) {
    try {
      const url = new URL(text);
      if (url.origin.toLowerCase() === origin) result = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      // AI NOTE: Already relative, or not a URL at all. Nothing to strip.
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function persistNode(node: unknown, origin: string | undefined): unknown {
  let result: unknown = node;
  if (Array.isArray(node)) {
    result = node.map((item) => persistNode(item, origin));
  } else if (isPlainObject(node)) {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      if (!NON_PERSISTED_KEYS.has(key)) {
        copy[key] = ORIGIN_RELATIVE_KEYS.has(key) && typeof child === "string" ? makeOriginRelative(child, origin) : persistNode(child, origin);
      }
    }
    result = copy;
  }
  return result;
}

// AI NOTE: Returns a stripped copy for storage. The caller's own object is never mutated, so runtime data keeps rawMarkup and absolute URLs.
export function toPersistedValue<T>(value: T, environment: string): T {
  return persistNode(value, resolveOrigin(environment)) as T;
}
