import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import type { QuickMenuButtonSetting, QuickMenuButtonSettings } from "./quick-menu.types";

export type { QuickMenuButtonSetting, QuickMenuButtonSettings } from "./quick-menu.types";

// Sitecore item names disallow these characters; suffixes are joined with "/" as path segments.
const INVALID_SUFFIX_CHARS = /[.\\:*?"<>|]/g;

export function sanitizeQuickMenuPathSuffix(value: string): string {
  return value
    .replace(INVALID_SUFFIX_CHARS, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

// Drops a leading suffix segment that duplicates the base path's last segment, so
// re-typing the base path's final folder (e.g. "Script Library") doesn't repeat it.
export function joinQuickMenuPath(basePath: string, rawSuffix: string): string {
  const suffix = sanitizeQuickMenuPathSuffix(rawSuffix);
  if (!suffix) return basePath;

  const baseSegments = basePath.split("/").filter(Boolean);
  const suffixSegments = suffix.split("/").filter(Boolean);
  const baseLastSegment = baseSegments[baseSegments.length - 1]?.toLowerCase();
  const dedupedSegments =
    baseLastSegment && suffixSegments[0]?.toLowerCase() === baseLastSegment
      ? suffixSegments.slice(1)
      : suffixSegments;

  return dedupedSegments.length ? `${basePath}/${dedupedSegments.join("/")}` : basePath;
}

const isQuickMenuButtonSetting = (value: unknown): value is QuickMenuButtonSetting => {
  if (!value || typeof value !== "object") return false;
  const setting = value as Record<string, unknown>;
  return (
    typeof setting.label === "string" &&
    typeof setting.enabled === "boolean" &&
    typeof setting.pathSuffix === "string"
  );
};

function normalizeQuickMenuButtonSettings(value: unknown): QuickMenuButtonSettings {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>).filter(([, setting]) =>
    isQuickMenuButtonSetting(setting),
  ) as Array<[string, QuickMenuButtonSetting]>;
  return Object.fromEntries(entries);
}

export async function getQuickMenuButtonSettings(): Promise<QuickMenuButtonSettings> {
  const result = await getStorageValue([STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]);
  return normalizeQuickMenuButtonSettings(result[STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]);
}

export async function setQuickMenuButtonSettings(
  settings: QuickMenuButtonSettings,
): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]: settings,
  });
}

export function onQuickMenuButtonSettingsChanged(
  callback: (settings: QuickMenuButtonSettings) => void,
): void {
  onStorageChange(STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS, (newValue) => {
    callback(normalizeQuickMenuButtonSettings(newValue));
  });
}
