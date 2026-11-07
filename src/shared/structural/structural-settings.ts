import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage.ts";
import { STRUCTURAL, STRUCTURAL_BASE_PATHS } from "./structural.const.ts";
import type { StructuralSettings } from "./structural.types.ts";

export function normalizeStructuralSettings(value: unknown): StructuralSettings {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    baseTemplatePaths: {
      page: STRUCTURAL_BASE_PATHS.PAGE,
      site: STRUCTURAL_BASE_PATHS.SITE,
      tenant: STRUCTURAL_BASE_PATHS.TENANT,
    },
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