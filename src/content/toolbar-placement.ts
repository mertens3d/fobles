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

// One placement per page, shared across every Sitecore instance the user visits - not per-origin.
// Per-origin storage previously stored the user's real business domain names in chrome.storage.
// sync (synced across their whole browser profile/devices), which is unnecessary exposure for a
// value that's purely cosmetic (where the draggable toolbar sits on screen). Each FOBLES_PAGES
// entry (src/content/constants.ts) gets its own sync key, created only once the user actually
// drags the toolbar on that particular page - until then it falls back to the shared default.
function storageKeyForPage(pageId: string): string {
  return `${STORAGE.KEY.FOBLES_NAV_POSITION}_${pageId}`;
}

export function getPlacementForPage(
  pageId: string,
  fallback: ToolbarPlacement = DEFAULT_TOOLBAR_PLACEMENT,
): Promise<ToolbarPlacement> {
  return getPlacement(storageKeyForPage(pageId), fallback);
}

export function setPlacementForPage(pageId: string, placement: ToolbarPlacement): Promise<void> {
  return setPlacement(storageKeyForPage(pageId), placement);
}

async function getPlacement(
  storageKey: string,
  fallback: ToolbarPlacement,
): Promise<ToolbarPlacement> {
  const result = await getStorageValue([storageKey]);
  const value = result[storageKey];
  return isValidPlacement(value) ? value : fallback;
}

async function setPlacement(storageKey: string, placement: ToolbarPlacement): Promise<void> {
  await setStorageValue({ [storageKey]: placement });
}
