// @source-path [fobles] src/shared/storage/storage.ts

export type StorageArea = "sync" | "local";

export async function getStorageValue<T = unknown>(
  keys: string[] | null,
  area: StorageArea = "sync",
): Promise<Record<string, T>> {
  try {
    const storage = chrome.storage?.[area];

    if (!storage) {
      return {};
    }

    return await storage.get(keys);
  } catch {
    // The content script can outlive a reloaded extension context.
    return {};
  }
}

export async function setStorageValue(
  values: Record<string, unknown>,
  area: StorageArea = "sync",
): Promise<void> {
  try {
    await chrome.storage?.[area]?.set(values);
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

export async function removeStorageValue(
  keys: string | string[],
  area: StorageArea = "sync",
): Promise<void> {
  try {
    await chrome.storage?.[area]?.remove(keys);
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

// Calls back with a single key's new value whenever it changes in the given storage area.
export function onStorageChange(
  key: string,
  callback: (newValue: unknown) => void,
  area: StorageArea = "sync",
): void {
  chrome.storage?.onChanged?.addListener(
    (changes, areaName) => {
      if (
        areaName === area &&
        key in changes
      ) {
        callback(changes[key].newValue);
      }
    },
  );
}

// Dumps every stored key/value across both areas, for the options page's debug viewer.
export async function getAllStorageValues(): Promise<{
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
}> {
  const [sync, local] = await Promise.all([
    getStorageValue(null, "sync"),
    getStorageValue(null, "local"),
  ]);

  return {
    sync,
    local,
  };
}

// Wipes every Fobles setting across both storage areas.
export async function clearAllStorageValues(): Promise<void> {
  try {
    await Promise.all([
      chrome.storage?.sync?.clear(),
      chrome.storage?.local?.clear(),
    ]);
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}