import { DEFAULT_TOOLBAR_PLACEMENT, TOOLBAR_CORNERS } from "../constants/fobles.constants";
import { STORAGE } from "../constants/extension-const";
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

// AI NOTE: One placement per page, shared across every Sitecore instance - not per-origin.
// AI NOTE: Per-origin keys stored real business domain names in chrome.storage.sync, which syncs across devices.
// AI NOTE: Each FOBLES_PAGES entry (src/content/constants.ts) gets its own key, created only once the user drags the toolbar on that page.
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
