// @source-path [fobles] src/content/toolbar/jump-flyout/use-user-admin-pages.ts

import { createStorageSyncedStore } from "../create-storage-synced-store";
import {
  getUserAdminPages,
  onUserAdminPagesChanged,
  type UserAdminPage,
} from "../../../shared/jump-flyout/user-admin-page-settings";

export const useUserAdminPages = createStorageSyncedStore<UserAdminPage[]>(
  getUserAdminPages,
  onUserAdminPagesChanged,
  [],
).useValue;
