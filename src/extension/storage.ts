import {
  DEFAULT_TOOLBAR_PLACEMENT,
  STORAGE,
  TOOLBAR_CORNERS,
  type ToolbarPlacement,
} from "./constants";
import { extensionLog } from "./logger";
import type { DebugSettings } from "./content.types";

function isValidPlacement(value: unknown): value is ToolbarPlacement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ToolbarPlacement>;
  return (
    TOOLBAR_CORNERS.includes(candidate.corner as ToolbarPlacement["corner"]) &&
    typeof candidate.offsetX === "number" &&
    typeof candidate.offsetY === "number"
  );
}

async function setSyncValue(values: Record<string, unknown>): Promise<void> {
  try {
    await chrome.storage?.sync?.set(values);
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

export async function getDebugSettings(): Promise<DebugSettings> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) {
      return {
        debugLogging: false,
        showReloadExtensionButton: false,
      };
    }

    const result = await storage.get([
      STORAGE.KEY.DEBUG_LOGGING,
      STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON,
    ]);

    return {
      debugLogging: Boolean(result[STORAGE.KEY.DEBUG_LOGGING]),
      showReloadExtensionButton: Boolean(
        result[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON],
      ),
    };
  } catch {
    return {
      debugLogging: false,
      showReloadExtensionButton: false,
    };
  }
}

export async function getFobleNavVisible(): Promise<boolean> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return true;

    const result = await storage.get([STORAGE.KEY.FOBLE_NAV_VISIBLE]);
    const value = result[STORAGE.KEY.FOBLE_NAV_VISIBLE];
    return typeof value === "boolean" ? value : true;
  } catch {
    return true;
  }
}

export async function setFobleNavVisible(visible: boolean): Promise<void> {
  await setSyncValue({
    [STORAGE.KEY.FOBLE_NAV_VISIBLE]: visible,
  });
}

export async function getFobleNavWarningVisible(): Promise<boolean> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return true;

    const result = await storage.get([STORAGE.KEY.FOBLE_NAV_WARNING_VISIBLE]);
    const value = result[STORAGE.KEY.FOBLE_NAV_WARNING_VISIBLE];
    return typeof value === "boolean" ? value : true;
  } catch {
    return true;
  }
}

export async function setFobleNavWarningVisible(visible: boolean): Promise<void> {
  await setSyncValue({
    [STORAGE.KEY.FOBLE_NAV_WARNING_VISIBLE]: visible,
  });
}

export async function getTurnOffFoblesAfterNavigation(): Promise<boolean> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return false;

    const result = await storage.get([
      STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION,
    ]);
    return result[STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION] === true;
  } catch {
    return false;
  }
}

async function getPlacementForOrigin(
  storageKey: string,
  origin: string,
): Promise<ToolbarPlacement> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return DEFAULT_TOOLBAR_PLACEMENT;

    const result = await storage.get([storageKey]);
    const placementsByOrigin = result[storageKey];
    const value = (placementsByOrigin as Record<string, unknown> | undefined)?.[origin];
    return isValidPlacement(value) ? value : DEFAULT_TOOLBAR_PLACEMENT;
  } catch {
    return DEFAULT_TOOLBAR_PLACEMENT;
  }
}

async function setPlacementForOrigin(
  storageKey: string,
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return;

    const result = await storage.get([storageKey]);
    const placementsByOrigin = (result[storageKey] as Record<string, ToolbarPlacement> | undefined) ?? {};
    await setSyncValue({
      [storageKey]: { ...placementsByOrigin, [origin]: placement },
    });
  } catch {
    // The content script can outlive a reloaded extension context.
  }
}

export function getFobleNavPlacement(origin: string): Promise<ToolbarPlacement> {
  return getPlacementForOrigin(STORAGE.KEY.FOBLE_NAV_POSITION, origin);
}

export function setFobleNavPlacement(
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  return setPlacementForOrigin(STORAGE.KEY.FOBLE_NAV_POSITION, origin, placement);
}

export function getSelectRenderingFobleNavPlacement(origin: string): Promise<ToolbarPlacement> {
  return getPlacementForOrigin(STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION, origin);
}

export function setSelectRenderingFobleNavPlacement(
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  return setPlacementForOrigin(STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION, origin, placement);
}

