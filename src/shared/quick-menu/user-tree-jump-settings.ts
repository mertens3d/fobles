import { SITECORE } from "../../content/sitecore";
import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import { joinQuickMenuPath, sanitizeQuickMenuPathSuffix } from "./button-settings";
import { USER_TREE_JUMP } from "./user-tree-jump-constants";
import type { UserTreeJump } from "./quick-menu.types";

export type { UserTreeJump } from "./quick-menu.types";

// Recognizes both icon prefix conventions already used elsewhere in this codebase's own catalog
// (see src/shared/quick-menu/menu-groups.ts) so a user pasting either one still normalizes cleanly.
const KNOWN_ICON_PREFIX_PATTERN = /^\/?[~-]\/icon\//i;

export function createUserTreeJumpId(): string {
  return crypto.randomUUID();
}

// Strips whatever prefix (if any) the user typed or pasted, then reapplies the one Sitecore
// actually expects, so the user only ever has to get the icon's own relative path right.
export function normalizeUserTreeJumpIconPath(rawIcon: string): string {
  const trimmed = rawIcon.trim();
  const withoutPrefix = trimmed.replace(KNOWN_ICON_PREFIX_PATTERN, "").replace(/^\/+/, "");
  const relativePath = withoutPrefix || USER_TREE_JUMP.DEFAULT_ICON_PATH;
  return `${USER_TREE_JUMP.ICON_PREFIX}${relativePath}`;
}

// Every user Tree Jump is rooted at SITECORE.RELATIVE_PATHS.ROOT - the suffix is the only part
// the user actually controls, exactly like the fixed catalog's own base path + suffix buttons.
export function buildUserTreeJumpPath(pathSuffix: string): string {
  return joinQuickMenuPath(SITECORE.RELATIVE_PATHS.ROOT, pathSuffix);
}

const isUserTreeJump = (value: unknown): value is UserTreeJump => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.label === "string" &&
    typeof entry.enabled === "boolean" &&
    typeof entry.icon === "string" &&
    typeof entry.pathSuffix === "string"
  );
};

function normalizeUserTreeJumps(value: unknown): UserTreeJump[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isUserTreeJump)
    .slice(0, USER_TREE_JUMP.MAX_ENTRIES)
    .map((entry) => ({
      ...entry,
      icon: normalizeUserTreeJumpIconPath(entry.icon),
      pathSuffix: sanitizeQuickMenuPathSuffix(entry.pathSuffix),
    }));
}

export async function getUserTreeJumps(): Promise<UserTreeJump[]> {
  const result = await getStorageValue([STORAGE.KEY.USER_TREE_JUMPS]);
  return normalizeUserTreeJumps(result[STORAGE.KEY.USER_TREE_JUMPS]);
}

export async function setUserTreeJumps(entries: UserTreeJump[]): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.USER_TREE_JUMPS]: normalizeUserTreeJumps(entries),
  });
}

export function onUserTreeJumpsChanged(
  callback: (entries: UserTreeJump[]) => void,
): void {
  onStorageChange(STORAGE.KEY.USER_TREE_JUMPS, (newValue) => {
    callback(normalizeUserTreeJumps(newValue));
  });
}
