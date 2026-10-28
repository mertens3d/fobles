// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache-persistence.ts

import { SITECORE_DATA_CACHE } from "../../../../constants/sitecore-data-cache.const.ts";

const NON_PERSISTED_KEYS: ReadonlySet<string> = new Set([...SITECORE_DATA_CACHE.NON_PERSISTED_KEYS, "facts", "rawData", "rawMarkup"]);
const ORIGIN_RELATIVE_KEYS: ReadonlySet<string> = new Set(SITECORE_DATA_CACHE.ORIGIN_RELATIVE_KEYS);
const OMIT = Symbol("omit-persisted-value");

type PersistedNode = unknown | typeof OMIT;

function resolveOrigin(environment: string): string | undefined {
  let origin: string | undefined;

  try {
    origin = new URL(environment.trim()).origin.toLowerCase();
  } catch {
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
      // Already relative, or not a URL.
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function persistNode(node: unknown, origin: string | undefined): PersistedNode {
  if (node === undefined || node === null) return OMIT;
  if (typeof node === "string") return node.trim().length > 0 ? node : OMIT;

  if (Array.isArray(node)) {
    return node.map((item) => persistNode(item, origin)).filter((item): item is Exclude<PersistedNode, typeof OMIT> => item !== OMIT);
  }

  if (isPlainObject(node)) {
    const copy: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(node)) {
      if (NON_PERSISTED_KEYS.has(key)) continue;
      const normalizedChild = ORIGIN_RELATIVE_KEYS.has(key) && typeof child === "string"
        ? persistNode(makeOriginRelative(child, origin), origin)
        : persistNode(child, origin);
      if (normalizedChild !== OMIT) copy[key] = normalizedChild;
    }

    return Object.keys(copy).length > 0 ? copy : OMIT;
  }

  return node;
}

export function toPersistedValue<T>(value: T, environment: string): T {
  const persisted = persistNode(value, resolveOrigin(environment));
  return (persisted === OMIT ? undefined : persisted) as T;
}
