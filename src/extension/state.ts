import { STORAGE } from "./constants";

export function getFoblesState(): boolean {
  const savedState = localStorage.getItem(STORAGE.KEY.FOBLES_STATE);
  return savedState ? savedState === "on" : true;
}

export function setFoblesState(enabled: boolean): void {
  localStorage.setItem(STORAGE.KEY.FOBLES_STATE, enabled ? "on" : "off");
}
