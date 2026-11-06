import { knownSitesStorageKey } from "../../shared/known-sites/known-sites-model.ts";
import { normalizeHistoryScope } from "../../shared/item-history/item-history-model.ts";
import { KNOWN_SITES } from "../../shared/structural/structural.const.ts";
import { normalizeStructuralSettings } from "../../shared/structural/structural-settings.ts";
import type { StructuralScope, StructuralSettings } from "../../shared/structural/structural.types.ts";
import { STRUCTURAL_OPTIONS } from "./structural-options.const.ts";
import type { StructuralSettingsDraft } from "./structural-options.types.ts";

export function structuralSettingsDraft(settings: StructuralSettings): StructuralSettingsDraft {
  return {
    paths: {
      page: settings.baseTemplatePaths.page.join("\n"),
      site: settings.baseTemplatePaths.site.join("\n"),
      tenant: settings.baseTemplatePaths.tenant.join("\n"),
    },
    showToolbarDiagnostics: settings.showToolbarDiagnostics === true,
  };
}

export function parseStructuralSettingsDraft(draft: StructuralSettingsDraft): StructuralSettings {
  const baseTemplatePaths = { page: [] as string[], site: [] as string[], tenant: [] as string[] };
  for (const { kind } of STRUCTURAL_OPTIONS.PATH_FIELDS) {
    const candidates = draft.paths[kind].split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
    for (const path of candidates) {
      const normalized = normalizeStructuralSettings({ baseTemplatePaths: { [kind]: [path] } });
      if (normalized.baseTemplatePaths[kind].length !== 1) {
        throw new TypeError(STRUCTURAL_OPTIONS.INVALID_PATHS);
      }
    }
    baseTemplatePaths[kind] = candidates;
  }
  return normalizeStructuralSettings({ baseTemplatePaths, showToolbarDiagnostics: draft.showToolbarDiagnostics });
}

export function knownSiteScopes(values: Record<string, unknown>): StructuralScope[] {
  const scopes: StructuralScope[] = [];
  for (const key of Object.keys(values)) {
    if (key.startsWith(KNOWN_SITES.KEY_PREFIX)) {
      try {
        const parts = key.slice(KNOWN_SITES.KEY_PREFIX.length).split(":");
        if (parts.length === 2) {
          const scope = normalizeHistoryScope({ origin: decodeURIComponent(parts[0]), database: decodeURIComponent(parts[1]) });
          if (knownSitesStorageKey(scope) === key) {
            scopes.push(scope);
          }
        }
      } catch {
        continue;
      }
    }
  }
  return scopes.sort((a, b) => a.origin.localeCompare(b.origin) || a.database.localeCompare(b.database));
}

export function structuralError(error: unknown): string {
  return error instanceof Error ? error.message.replace(/\bscope\b/gi, "Sitecore environment and database") : "Structural operation failed.";
}