import { STORAGE } from "../../constants/constants-b";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import type { JumpFlyoutButtonSetting, JumpFlyoutButtonSettings } from "./jump-flyout.types";

export type { JumpFlyoutButtonSetting, JumpFlyoutButtonSettings } from "./jump-flyout.types";

// Recognizes both icon prefix conventions already used elsewhere in this codebase's own catalog
// (see src/shared/jump-flyout/flyout-groups.ts) so a user pasting either one still normalizes cleanly.
const KNOWN_ICON_PREFIX_PATTERN = /^\/?[~-]\/icon\//i;
// The prefix reapplied after stripping whatever the user typed - Sitecore's icon-serving virtual path.
const ICON_PREFIX = "/-/icon/";

// Shared by every user-defined jump-flyout entry (Tree Jumps, Admin Pages, ...): strips whatever
// prefix (if any) the user typed or pasted, then reapplies the one Sitecore actually expects, so
// the user only ever has to get the icon's own relative path right.
export function normalizeJumpFlyoutIconPath(rawIcon: string, defaultIconPath: string): string {
  const trimmed = rawIcon.trim();
  const withoutPrefix = trimmed.replace(KNOWN_ICON_PREFIX_PATTERN, "").replace(/^\/+/, "");
  const relativePath = withoutPrefix || defaultIconPath;
  return `${ICON_PREFIX}${relativePath}`;
}

// Sitecore item names disallow these characters; suffixes are joined with "/" as path segments.
const INVALID_SUFFIX_CHARS = /[.\\:*?"<>|]/g;

export function sanitizeJumpFlyoutPathSuffix(value: string): string {
  return value
    .replace(INVALID_SUFFIX_CHARS, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

// Drops a leading suffix segment that duplicates the base path's last segment, so
// re-typing the base path's final folder (e.g. "Script Library") doesn't repeat it.
export function joinJumpFlyoutPath(basePath: string, rawSuffix: string): string {
  const suffix = sanitizeJumpFlyoutPathSuffix(rawSuffix);
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

const isJumpFlyoutButtonSetting = (value: unknown): value is JumpFlyoutButtonSetting => {
  if (!value || typeof value !== "object") return false;
  const setting = value as Record<string, unknown>;
  return (
    typeof setting.label === "string" &&
    typeof setting.enabled === "boolean" &&
    typeof setting.pathSuffix === "string"
  );
};

function normalizeJumpFlyoutButtonSettings(value: unknown): JumpFlyoutButtonSettings {
  if (!value || typeof value !== "object") return {};

  const entries = Object.entries(value as Record<string, unknown>).filter(([, setting]) =>
    isJumpFlyoutButtonSetting(setting),
  ) as Array<[string, JumpFlyoutButtonSetting]>;
  return Object.fromEntries(entries);
}

export async function getJumpFlyoutButtonSettings(): Promise<JumpFlyoutButtonSettings> {
  const result = await getStorageValue([STORAGE.KEY.JUMP_FLYOUT_BUTTON_SETTINGS]);
  return normalizeJumpFlyoutButtonSettings(result[STORAGE.KEY.JUMP_FLYOUT_BUTTON_SETTINGS]);
}

export async function setJumpFlyoutButtonSettings(
  settings: JumpFlyoutButtonSettings,
): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.JUMP_FLYOUT_BUTTON_SETTINGS]: settings,
  });
}

export function onJumpFlyoutButtonSettingsChanged(
  callback: (settings: JumpFlyoutButtonSettings) => void,
): void {
  onStorageChange(STORAGE.KEY.JUMP_FLYOUT_BUTTON_SETTINGS, (newValue) => {
    callback(normalizeJumpFlyoutButtonSettings(newValue));
  });
}
