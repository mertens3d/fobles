import { CONST } from "../../constants/const";
import { STORAGE } from "../../constants/constants-b";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import { joinJumpFlyoutPath, normalizeJumpFlyoutIconPath, sanitizeJumpFlyoutPathSuffix } from "./button-settings";
import { USER_TREE_JUMP } from "../../constants/user-tree-jump-constants";
import type { UserTreeJump } from "./jump-flyout.types";

export type { UserTreeJump } from "./jump-flyout.types";

export function createUserTreeJumpId(): string {
  return crypto.randomUUID();
}

export function normalizeUserTreeJumpIconPath(rawIcon: string): string {
  return normalizeJumpFlyoutIconPath(rawIcon, USER_TREE_JUMP.DEFAULT_ICON_PATH);
}

// Every user Tree Jump is rooted at SITECORE.RELATIVE_PATHS.ROOT - the suffix is the only part
// the user actually controls, exactly like the fixed catalog's own base path + suffix buttons.
export function buildUserTreeJumpPath(pathSuffix: string): string {
  return joinJumpFlyoutPath(CONST.SITECORE.RELATIVE_PATHS_ENCODED.ROOT, pathSuffix);
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
      pathSuffix: sanitizeJumpFlyoutPathSuffix(entry.pathSuffix),
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
