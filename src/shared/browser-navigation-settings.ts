// @source-path [fobles] src/shared/browser-navigation-settings.ts

import { getStorageValue, onStorageChange, setStorageValue } from "./storage/storage";
import { BROWSER_NAVIGATION_HISTORY_STORAGE_KEY } from "./shared.const";

export async function getBrowserNavigationHistoryEnabled(): Promise<boolean> {
  const values = await getStorageValue<boolean>([BROWSER_NAVIGATION_HISTORY_STORAGE_KEY]);
  return values[BROWSER_NAVIGATION_HISTORY_STORAGE_KEY] === true;
}

export async function setBrowserNavigationHistoryEnabled(enabled: boolean): Promise<void> {
  await setStorageValue({ [BROWSER_NAVIGATION_HISTORY_STORAGE_KEY]: enabled });
}

export function onBrowserNavigationHistoryEnabledChange(callback: (enabled: boolean) => void): () => void {
  return onStorageChange(BROWSER_NAVIGATION_HISTORY_STORAGE_KEY, (value) => callback(value === true));
}
