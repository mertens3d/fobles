import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "../storage/storage";
import { normalizeJumpFlyoutIconPath } from "./button-settings";
import { USER_ADMIN_PAGE } from "./user-admin-page-constants";
import type { UserAdminPage } from "./jump-menu.types";

export type { UserAdminPage } from "./jump-menu.types";

export function createUserAdminPageId(): string {
  return crypto.randomUUID();
}

export function normalizeUserAdminPageIconPath(rawIcon: string): string {
  return normalizeJumpFlyoutIconPath(rawIcon, USER_ADMIN_PAGE.DEFAULT_ICON_PATH);
}

// Unlike a Tree Jump's pathSuffix (joined onto SITECORE.RELATIVE_PATHS.ROOT), an admin page's url
// is already relative to the current domain root (e.g. "/unicorn.aspx") - nothing to join, just a
// single leading slash to enforce.
export function normalizeUserAdminPageUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : "";
}

const isUserAdminPage = (value: unknown): value is UserAdminPage => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.label === "string" &&
    typeof entry.enabled === "boolean" &&
    typeof entry.icon === "string" &&
    typeof entry.url === "string"
  );
};

function normalizeUserAdminPages(value: unknown): UserAdminPage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isUserAdminPage)
    .slice(0, USER_ADMIN_PAGE.MAX_ENTRIES)
    .map((entry) => ({
      ...entry,
      icon: normalizeUserAdminPageIconPath(entry.icon),
      url: normalizeUserAdminPageUrl(entry.url),
    }));
}

export async function getUserAdminPages(): Promise<UserAdminPage[]> {
  const result = await getStorageValue([STORAGE.KEY.USER_ADMIN_PAGES]);
  return normalizeUserAdminPages(result[STORAGE.KEY.USER_ADMIN_PAGES]);
}

export async function setUserAdminPages(entries: UserAdminPage[]): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.USER_ADMIN_PAGES]: normalizeUserAdminPages(entries),
  });
}

export function onUserAdminPagesChanged(
  callback: (entries: UserAdminPage[]) => void,
): void {
  onStorageChange(STORAGE.KEY.USER_ADMIN_PAGES, (newValue) => {
    callback(normalizeUserAdminPages(newValue));
  });
}
