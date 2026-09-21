import { DEFAULT_TOOLBAR_PLACEMENT, TOOLBAR_CORNERS } from "./constants";
import { STORAGE } from "../shared/constants";
import { getStorageValue, setStorageValue } from "../shared/storage/storage";
import type { ToolbarPlacement } from "./toolbar.types";

function isValidPlacement(value: unknown): value is ToolbarPlacement {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ToolbarPlacement>;
  return (
    TOOLBAR_CORNERS.includes(candidate.corner as ToolbarPlacement["corner"]) &&
    typeof candidate.offsetX === "number" &&
    typeof candidate.offsetY === "number"
  );
}

// One placement per storage key, shared across every Sitecore instance the user visits - not
// per-origin. Per-origin storage previously stored the user's real business domain names in
// chrome.storage.sync (synced across their whole browser profile/devices), which is unnecessary
// exposure for a value that's purely cosmetic (where the draggable toolbar sits on screen).
async function getPlacement(storageKey: string): Promise<ToolbarPlacement> {
  const result = await getStorageValue([storageKey]);
  const value = result[storageKey];
  return isValidPlacement(value) ? value : DEFAULT_TOOLBAR_PLACEMENT;
}

async function setPlacement(storageKey: string, placement: ToolbarPlacement): Promise<void> {
  await setStorageValue({ [storageKey]: placement });
}

export function getFoblesNavPlacement(): Promise<ToolbarPlacement> {
  return getPlacement(STORAGE.KEY.FOBLES_NAV_POSITION);
}

export function setFoblesNavPlacement(placement: ToolbarPlacement): Promise<void> {
  return setPlacement(STORAGE.KEY.FOBLES_NAV_POSITION, placement);
}

export function getSelectRenderingFoblesNavPlacement(): Promise<ToolbarPlacement> {
  return getPlacement(STORAGE.KEY.FOBLES_NAV_POSITION_SELECT_RENDERING);
}

export function setSelectRenderingFoblesNavPlacement(placement: ToolbarPlacement): Promise<void> {
  return setPlacement(STORAGE.KEY.FOBLES_NAV_POSITION_SELECT_RENDERING, placement);
}
