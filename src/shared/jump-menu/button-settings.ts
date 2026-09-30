import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import type { JumpMenuButtonSetting, JumpMenuButtonSettings } from "./jump-menu.types";

export type { JumpMenuButtonSetting, JumpMenuButtonSettings } from "./jump-menu.types";

// Recognizes both icon prefix conventions already used elsewhere in this codebase's own catalog
// (see src/shared/jump-menu/menu-groups.ts) so a user pasting either one still normalizes cleanly.
const KNOWN_ICON_PREFIX_PATTERN = /^\/?[~-]\/icon\//i;
// The prefix reapplied after stripping whatever the user typed - Sitecore's icon-serving virtual path.
const ICON_PREFIX = "/-/icon/";

// Shared by every user-defined jump-menu entry (Tree Jumps, Admin Pages, ...): strips whatever
// prefix (if any) the user typed or pasted, then reapplies the one Sitecore actually expects, so
// the user only ever has to get the icon's own relative path right.
export function normalizeJumpMenuIconPath(rawIcon: string, defaultIconPath: string): string {
  const trimmed = rawIcon.trim();
  const withoutPrefix = trimmed.replace(KNOWN_ICON_PREFIX_PATTERN, "").replace(/^\/+/, "");
  const relativePath = withoutPrefix || defaultIconPath;
  return `${ICON_PREFIX}${relativePath}`;
}

// Sitecore item names disallow these characters; suffixes are joined with "/" as path segments.
const INVALID_SUFFIX_CHARS = /[.\\:*?"<>|]/g;

export function sanitizeJumpMenuPathSuffix(value: string): string {
  return value
    .replace(INVALID_SUFFIX_CHARS, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

// Drops a leading suffix segment that duplicates the base path's last segment, so
// re-typing the base path's final folder (e.g. "Script Library") doesn't repeat it.
export function joinJumpMenuPath(basePath: string, rawSuffix: string): string {
  const suffix = sanitizeJumpMenuPathSuffix(rawSuffix);
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

const isJumpMenuButtonSetting = (value: unknown): value is JumpMenuButtonSetting => {
  if (!value || typeof value !== "object") return false;
  const setting = value as Record<string, unknown>;
  return (
    typeof setting.label === "string" &&
    typeof setting.enabled === "boolean" &&
    typeof setting.pathSuffix === "string"
  );
};

function normalizeJumpMenuButtonSettings(value: unknown): JumpMenuButtonSettings {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>).filter(([, setting]) =>
    isJumpMenuButtonSetting(setting),
  ) as Array<[string, JumpMenuButtonSetting]>;
  return Object.fromEntries(entries);
}

export async function getJumpMenuButtonSettings(): Promise<JumpMenuButtonSettings> {
  const result = await getStorageValue([STORAGE.KEY.JUMP_MENU_BUTTON_SETTINGS]);
  return normalizeJumpMenuButtonSettings(result[STORAGE.KEY.JUMP_MENU_BUTTON_SETTINGS]);
}

export async function setJumpMenuButtonSettings(
  settings: JumpMenuButtonSettings,
): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.JUMP_MENU_BUTTON_SETTINGS]: settings,
  });
}

export function onJumpMenuButtonSettingsChanged(
  callback: (settings: JumpMenuButtonSettings) => void,
): void {
  onStorageChange(STORAGE.KEY.JUMP_MENU_BUTTON_SETTINGS, (newValue) => {
    callback(normalizeJumpMenuButtonSettings(newValue));
  });
}
