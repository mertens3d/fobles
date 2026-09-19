import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "./storage";

export type DebugSettings = {
  debugLogging: boolean;
  showReloadExtensionButton: boolean;
};

export async function getDebugSettings(): Promise<DebugSettings> {
  const result = await getStorageValue<boolean>([
    STORAGE.KEY.DEBUG_LOGGING,
    STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON,
  ]);

  return {
    debugLogging: Boolean(result[STORAGE.KEY.DEBUG_LOGGING]),
    showReloadExtensionButton: Boolean(
      result[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON],
    ),
  };
}

export async function setDebugSettings(settings: DebugSettings): Promise<void> {
  await setStorageValue({
    [STORAGE.KEY.DEBUG_LOGGING]: settings.debugLogging,
    [STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]: settings.showReloadExtensionButton,
  });
}

export function onShowReloadExtensionButtonChange(
  callback: (visible: boolean) => void,
): void {
  onStorageChange(STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON, (newValue) => {
    callback(newValue === true);
  });
}
