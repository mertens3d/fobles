import {
  STORAGE,
  TOOLBAR_POSITIONS,
  type ToolbarPosition,
} from "./constants";
import { extensionLog } from "./logger";
import type { DebugSettings } from "./content.types";

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

export async function getShowReloadExtensionButton(): Promise<boolean> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return false;

    const result = await storage.get([STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]);
    return result[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON] === true;
  } catch {
    return false;
  }
}

export async function setShowReloadExtensionButton(
  visible: boolean,
): Promise<void> {
  await setSyncValue({
    [STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]: visible,
  });
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

export async function getFobleNavPosition(): Promise<ToolbarPosition> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return "upper-left";

    const result = await storage.get([STORAGE.KEY.FOBLE_NAV_POSITION]);
    const value = result[STORAGE.KEY.FOBLE_NAV_POSITION];
    return TOOLBAR_POSITIONS.includes(value as ToolbarPosition)
      ? value as ToolbarPosition
      : "upper-left";
  } catch {
    return "upper-left";
  }
}

export async function setFobleNavPosition(
  position: ToolbarPosition,
): Promise<void> {
  await setSyncValue({
    [STORAGE.KEY.FOBLE_NAV_POSITION]: position,
  });
}

export async function getSelectRenderingFobleNavPosition(): Promise<ToolbarPosition> {
  try {
    const storage = chrome.storage?.sync;
    if (!storage) return "upper-left";

    const result = await storage.get([
      STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION,
    ]);
    const value = result[STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION];
    return TOOLBAR_POSITIONS.includes(value as ToolbarPosition)
      ? value as ToolbarPosition
      : "upper-left";
  } catch {
    return "upper-left";
  }
}

export async function setSelectRenderingFobleNavPosition(
  position: ToolbarPosition,
): Promise<void> {
  await setSyncValue({
    [STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION]: position,
  });
}

