export async function getStorageValue<T = unknown>(
  keys: string[] | null,
  area: "sync" | "local" = "sync",
): Promise<Record<string, T>> {
  try {
    const storage = chrome.storage?.[area];
    if (!storage) return {};
    return (await storage.get(keys)) as Record<string, T>;
  } catch {
    // The content script can outlive a reloaded extension context.
    return {};
  }
}

export async function setStorageValue(
  values: Record<string, unknown>,
  area: "sync" | "local" = "sync",
): Promise<void> {
  try {
    await chrome.storage?.[area]?.set(values);
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

// Calls back with a single key's new value whenever it changes in the given storage area.
export function onStorageChange(
  key: string,
  callback: (newValue: unknown) => void,
  area: "sync" | "local" = "sync",
): void {
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== area) return;
    if (!(key in changes)) return;
    callback(changes[key].newValue);
  });
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
  return { sync, local };
}
