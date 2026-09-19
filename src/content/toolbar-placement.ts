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

async function getPlacementForOrigin(
  storageKey: string,
  origin: string,
): Promise<ToolbarPlacement> {
  const result = await getStorageValue([storageKey]);
  const placementsByOrigin = result[storageKey];
  const value = (placementsByOrigin as Record<string, unknown> | undefined)?.[origin];
  return isValidPlacement(value) ? value : DEFAULT_TOOLBAR_PLACEMENT;
}

async function setPlacementForOrigin(
  storageKey: string,
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  const result = await getStorageValue([storageKey]);
  const placementsByOrigin =
    (result[storageKey] as Record<string, ToolbarPlacement> | undefined) ?? {};
  await setStorageValue({
    [storageKey]: { ...placementsByOrigin, [origin]: placement },
  });
}

export function getFoblesNavPlacement(origin: string): Promise<ToolbarPlacement> {
  return getPlacementForOrigin(STORAGE.KEY.FOBLES_NAV_POSITION, origin);
}

export function setFoblesNavPlacement(
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  return setPlacementForOrigin(STORAGE.KEY.FOBLES_NAV_POSITION, origin, placement);
}

export function getSelectRenderingFoblesNavPlacement(origin: string): Promise<ToolbarPlacement> {
  return getPlacementForOrigin(STORAGE.KEY.SELECT_RENDERING_FOBLES_NAV_POSITION, origin);
}

export function setSelectRenderingFoblesNavPlacement(
  origin: string,
  placement: ToolbarPlacement,
): Promise<void> {
  return setPlacementForOrigin(
    STORAGE.KEY.SELECT_RENDERING_FOBLES_NAV_POSITION,
    origin,
    placement,
  );
}
