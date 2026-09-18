import { STORAGE } from "../../extension/constants";
import type { QuickMenuButtonSetting, QuickMenuButtonSettings } from "./menu.types";

export type { QuickMenuButtonSetting, QuickMenuButtonSettings } from "./menu.types";

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
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return {};

    const result = await storage.get([STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]);
    return normalizeQuickMenuButtonSettings(result[STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]);
  } catch {
    return {};
  }
}

export async function setQuickMenuButtonSettings(
  settings: QuickMenuButtonSettings,
): Promise<void> {
  try {
    await chrome.storage?.sync?.set({
      [STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS]: settings,
    });
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

export function onQuickMenuButtonSettingsChanged(
  callback: (settings: QuickMenuButtonSettings) => void,
): void {
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (!(STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS in changes)) return;

    callback(normalizeQuickMenuButtonSettings(changes[STORAGE.KEY.QUICK_MENU_BUTTON_SETTINGS].newValue));
  });
}
