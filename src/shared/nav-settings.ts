import { STORAGE } from "./constants";
import { getStorageValue, onStorageChange, setStorageValue } from "./storage/storage";

export async function getFoblesNavVisible(): Promise<boolean> {
  const result = await getStorageValue<boolean>([STORAGE.KEY.FOBLES_NAV_VISIBLE]);
  const value = result[STORAGE.KEY.FOBLES_NAV_VISIBLE];
  return typeof value === "boolean" ? value : true;
}

export async function setFoblesNavVisible(visible: boolean): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.FOBLES_NAV_VISIBLE]: visible });
}

export function onFoblesNavVisibleChange(callback: (visible: boolean) => void): void {
  onStorageChange(STORAGE.KEY.FOBLES_NAV_VISIBLE, (newValue) => {
    if (typeof newValue === "boolean") callback(newValue);
  });
}

export async function getFoblesNavWarningVisible(): Promise<boolean> {
  const result = await getStorageValue<boolean>([STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE]);
  const value = result[STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE];
  return typeof value === "boolean" ? value : true;
}

export async function setFoblesNavWarningVisible(visible: boolean): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE]: visible });
}

export function onFoblesNavWarningVisibleChange(callback: (visible: boolean) => void): void {
  onStorageChange(STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE, (newValue) => {
    if (typeof newValue === "boolean") callback(newValue);
  });
}

export async function getTurnOffFoblesAfterNavigation(): Promise<boolean> {
  const result = await getStorageValue<boolean>([
    STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION,
  ]);
  return result[STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION] === true;
}

export async function setTurnOffFoblesAfterNavigation(enabled: boolean): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION]: enabled });
}

export function onTurnOffFoblesAfterNavigationChange(
  callback: (enabled: boolean) => void,
): void {
  onStorageChange(STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION, (newValue) => {
    if (typeof newValue === "boolean") callback(newValue);
  });
}
