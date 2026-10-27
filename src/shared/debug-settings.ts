// @source-path [fobles] src/shared/debug-settings.ts
import { STORAGE } from "../constants/extension-const";
import { getStorageValue, onStorageChange, setStorageValue } from "./storage/storage";
export type DebugSettings = {
  debugLogging: boolean;
  persistDebugLogs: boolean;
  showReloadExtensionButton: boolean;
  showDeveloperButton: boolean;
};
export async function getDebugSettings(): Promise<DebugSettings> {
  const result = await getStorageValue<boolean>([
    STORAGE.KEY.DEBUG_LOGGING,
    STORAGE.KEY.PERSIST_DEBUG_LOGS,
    STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON,
    STORAGE.KEY.SHOW_DEVELOPER_BUTTON,
  ]);
  return {
    debugLogging: Boolean(result[STORAGE.KEY.DEBUG_LOGGING]),
    persistDebugLogs: Boolean(result[STORAGE.KEY.PERSIST_DEBUG_LOGS]),
    showReloadExtensionButton: Boolean(
      result[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON],
    ),
    showDeveloperButton: Boolean(result[STORAGE.KEY.SHOW_DEVELOPER_BUTTON]),
  };
}
export async function setDebugSettings(settings: DebugSettings): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.DEBUG_LOGGING]: settings.debugLogging,
    [STORAGE.KEY.PERSIST_DEBUG_LOGS]: settings.persistDebugLogs,
    [STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]: settings.showReloadExtensionButton,
    [STORAGE.KEY.SHOW_DEVELOPER_BUTTON]: settings.showDeveloperButton,
  });
}
export function onShowReloadExtensionButtonChange(
  callback: (visible: boolean) => void,
): void {
  onStorageChange(STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON, (newValue) => {
    callback(newValue === true);
  });
}
export function onShowDeveloperButtonChange(
  callback: (visible: boolean) => void,
): void {
  onStorageChange(STORAGE.KEY.SHOW_DEVELOPER_BUTTON, (newValue) => {
    callback(newValue === true);
  });
}
