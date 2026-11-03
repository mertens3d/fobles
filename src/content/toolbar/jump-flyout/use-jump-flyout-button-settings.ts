// @source-path [fobles] src/content/toolbar/jump-flyout/use-jump-flyout-button-settings.ts

import { createStorageSyncedStore } from "../create-storage-synced-store";
import {
  getJumpFlyoutButtonSettings,
  onJumpFlyoutButtonSettingsChanged,
  type JumpFlyoutButtonSettings,
} from "../../../shared/jump-flyout/button-settings";

const jumpFlyoutButtonSettingsStore = createStorageSyncedStore<JumpFlyoutButtonSettings>(
  getJumpFlyoutButtonSettings,
  onJumpFlyoutButtonSettingsChanged,
  {},
);

export const useJumpFlyoutButtonSettings = jumpFlyoutButtonSettingsStore.useValue;

export const getJumpFlyoutButtonSetting = (id: string) => jumpFlyoutButtonSettingsStore.getValue()[id];
