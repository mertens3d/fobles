// @source-path [fobles] src/content/toolbar/jump-flyout/use-user-tree-jumps.ts

import { createStorageSyncedStore } from "../create-storage-synced-store";
import { getUserTreeJumps, onUserTreeJumpsChanged, type UserTreeJump } from "../../../shared/jump-flyout/user-tree-jump-settings";

export const useUserTreeJumps = createStorageSyncedStore<UserTreeJump[]>(getUserTreeJumps, onUserTreeJumpsChanged, []).useValue;
