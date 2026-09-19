import { MESSAGE, STORAGE } from "../shared/constants";

const visibilityCheckbox = document.getElementById(
  "fobles-nav-visible",
) as HTMLInputElement | null;
const warningCheckbox = document.getElementById(
  "fobles-nav-warning-visible",
) as HTMLInputElement | null;
const turnOffAfterNavigationCheckbox = document.getElementById(
  "turn-off-fobles-after-navigation",
) as HTMLInputElement | null;
const openOptionsButton = document.getElementById("open-options") as HTMLButtonElement | null;
const reloadExtensionButton = document.getElementById(
  "reload-extension",
) as HTMLButtonElement | null;

void chrome.storage.sync
  .get([
    STORAGE.KEY.FOBLES_NAV_VISIBLE,
    STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE,
    STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION,
    STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON,
  ])
  .then((result) => {
    if (visibilityCheckbox) {
      visibilityCheckbox.checked = result[STORAGE.KEY.FOBLES_NAV_VISIBLE] !== false;
    }
    if (warningCheckbox) {
      warningCheckbox.checked = result[STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE] !== false;
    }
    if (turnOffAfterNavigationCheckbox) {
      turnOffAfterNavigationCheckbox.checked =
        result[STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION] === true;
    }
    if (reloadExtensionButton) {
      reloadExtensionButton.hidden = result[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON] !== true;
    }
  });

visibilityCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [STORAGE.KEY.FOBLES_NAV_VISIBLE]: visibilityCheckbox.checked,
  });
});

warningCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE]: warningCheckbox.checked,
  });
});

turnOffAfterNavigationCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION]:
      turnOffAfterNavigationCheckbox.checked,
  });
});

openOptionsButton?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

reloadExtensionButton?.addEventListener("click", () => {
  void chrome.runtime.sendMessage({ action: MESSAGE.ACTION.RELOAD_EXTENSION });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  if (
    visibilityCheckbox &&
    typeof changes[STORAGE.KEY.FOBLES_NAV_VISIBLE]?.newValue === "boolean"
  ) {
    visibilityCheckbox.checked = changes[STORAGE.KEY.FOBLES_NAV_VISIBLE].newValue as boolean;
  }
  if (
    warningCheckbox &&
    typeof changes[STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE]?.newValue === "boolean"
  ) {
    warningCheckbox.checked = changes[STORAGE.KEY.FOBLES_NAV_WARNING_VISIBLE].newValue as boolean;
  }
  if (
    turnOffAfterNavigationCheckbox &&
    typeof changes[STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION]?.newValue === "boolean"
  ) {
    turnOffAfterNavigationCheckbox.checked =
      changes[STORAGE.KEY.TURN_OFF_FOBLES_AFTER_NAVIGATION].newValue as boolean;
  }
  if (
    reloadExtensionButton &&
    typeof changes[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]?.newValue === "boolean"
  ) {
    reloadExtensionButton.hidden =
      changes[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON].newValue !== true;
  }
});
