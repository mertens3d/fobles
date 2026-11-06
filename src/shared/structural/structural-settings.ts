import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage.ts";
import { SITECORE } from "../../constants/sitecore.ts";
import { STRUCTURAL, STRUCTURAL_BASE_PATHS } from "./structural.const.ts";
import type { StructuralKind, StructuralSettings } from "./structural.types.ts";

export function normalizeStructuralSettings(value: unknown): StructuralSettings {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const paths = typeof record.baseTemplatePaths === "object" && record.baseTemplatePaths !== null
    ? record.baseTemplatePaths as Record<string, unknown> : {};
  const defaults = {
    page: STRUCTURAL_BASE_PATHS.PAGE,
    site: STRUCTURAL_BASE_PATHS.SITE,
    tenant: STRUCTURAL_BASE_PATHS.TENANT,
  };
  const baseTemplatePaths: Record<StructuralKind, readonly string[]> = { ...defaults };
  for (const kind of ["page", "site", "tenant"] as const) {
    if (Array.isArray(paths[kind])) {
      const root = SITECORE.ITEM_KIND.PATH_ROOTS.TEMPLATES.toLowerCase();
      const candidates = paths[kind].filter((path): path is string => typeof path === "string")
        .map((path) => path.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/+$/, ""))
        .filter((path) => path.toLowerCase().startsWith(`${root}/`) &&
          !path.split("/").some((segment) => segment === "." || segment === "..") && !Array.from(path).some((character) => {
            const code = character.charCodeAt(0);
            return code <= 31 || code === 127;
          }));
      baseTemplatePaths[kind] = [...new Set(candidates)];
    }
  }
  return {
    baseTemplatePaths,
    showToolbarDiagnostics: typeof record.showToolbarDiagnostics === "boolean"
      ? record.showToolbarDiagnostics : STRUCTURAL.DEFAULT_SHOW_TOOLBAR_DIAGNOSTICS,
  };
}

export async function getStructuralSettings(): Promise<StructuralSettings> {
  const values = await getStorageValue([STRUCTURAL.SETTINGS_KEY], "sync", true);
  return normalizeStructuralSettings(values[STRUCTURAL.SETTINGS_KEY]);
}

export async function saveStructuralSettings(settings: StructuralSettings): Promise<void> {
  await setStorageValue({ [STRUCTURAL.SETTINGS_KEY]: normalizeStructuralSettings(settings) }, "sync", true);
}

export function watchStructuralSettings(callback: (settings: StructuralSettings) => void): () => void {
  return onStorageChange(STRUCTURAL.SETTINGS_KEY, (value) => callback(normalizeStructuralSettings(value)), "sync");
}