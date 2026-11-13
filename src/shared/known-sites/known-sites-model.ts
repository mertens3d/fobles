import { SITECORE } from "../../constants/sitecore.const.ts";
import { normalizeHistoryId, normalizeHistoryScope, normalizeHistoryVisit } from "../item-history/item-history-model.ts";
import { KNOWN_SITES } from "../structural/structural.const.ts";
import type { KnownSite, KnownSitesChange, StructuralScope } from "../structural/structural.types.ts";

export function knownSitesStorageKey(scope: StructuralScope): string {
  const normalized = normalizeHistoryScope(scope);
  return `${KNOWN_SITES.KEY_PREFIX}${encodeURIComponent(normalized.origin)}:${encodeURIComponent(normalized.database)}`;
}

export function isWithinSitePath(path: string, root: string): boolean {
  const normalized = path.trim().replace(/\/+$/, "").toLowerCase();
  const base = root.trim().replace(/\/+$/, "").toLowerCase();
  return normalized === base || normalized.startsWith(`${base}/`);
}

export function normalizeKnownSite(value: unknown): KnownSite {
  const visit = normalizeHistoryVisit(value);
  const record = value as Record<string, unknown>;
  const templateId = normalizeHistoryId(record.templateId);
  if (!templateId || typeof record.validatedAt !== "number" || !Number.isFinite(record.validatedAt) ||
    record.validatedAt < 0 || !isWithinSitePath(visit.path, SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT)) {
    throw new TypeError("Invalid Known Site");
  }
  return { ...visit, templateId, validatedAt: record.validatedAt };
}

export function normalizeKnownSites(value: unknown): KnownSite[] {
  const sites = new Map<string, KnownSite>();
  if (Array.isArray(value)) {
    for (const entry of value as unknown[]) {
      try {
        const site = normalizeKnownSite(entry);
        if (!sites.has(site.id) || sites.get(site.id)!.validatedAt <= site.validatedAt) {
          sites.set(site.id, site);
        }
      } catch {
        continue;
      }
    }
  }
  return Array.from(sites.values()).sort((a, b) => a.path.localeCompare(b.path));
}

export function matchKnownSite(sites: readonly KnownSite[], path: string): KnownSite | undefined {
  return sites.filter((site) => isWithinSitePath(path, site.path)).sort((a, b) => b.path.length - a.path.length)[0];
}

export function normalizeKnownSitesChange(value: unknown): KnownSitesChange {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  let change: KnownSitesChange;
  if (record.action === "upsert") {
    change = { action: "upsert", site: normalizeKnownSite(record.site) };
  } else if (record.action === "remove" && normalizeHistoryId(record.id)) {
    change = { action: "remove", id: normalizeHistoryId(record.id)! };
  } else if (record.action === "clear") {
    change = { action: "clear" };
  } else if (record.action === "invalidate-validation") {
    change = { action: "invalidate-validation" };
  } else {
    throw new TypeError("Invalid Known Sites change");
  }
  return change;
}

export function applyKnownSitesChange(sites: unknown, change: KnownSitesChange, now: number): KnownSite[] {
  const rows = normalizeKnownSites(sites);
  const next = change.action === "invalidate-validation" ? rows.map((site) => ({ ...site, validatedAt: 0 }))
    : change.action === "clear" ? [] : change.action === "remove"
    ? rows.filter((site) => site.id !== change.id)
    : [...rows.filter((site) => site.id !== change.site.id), { ...change.site, validatedAt: now }];
  return normalizeKnownSites(next);
}