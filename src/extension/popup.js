const FOBLES_NAV_VISIBLE_KEY = "foblesNavVisible";
const FOBLES_NAV_WARNING_VISIBLE_KEY = "foblesNavWarningVisible";
const TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY = "turnOffFoblesAfterNavigation";
const SHOW_RELOAD_EXTENSION_BUTTON_KEY = "showReloadExtensionButton";
const visibilityCheckbox = document.getElementById("fobles-nav-visible");
const warningCheckbox = document.getElementById("fobles-nav-warning-visible");
const turnOffAfterNavigationCheckbox = document.getElementById(
  "turn-off-fobles-after-navigation",
);
const openOptionsButton = document.getElementById("open-options");
const reloadExtensionButton = document.getElementById("reload-extension");

void chrome.storage.sync
  .get([
    FOBLES_NAV_VISIBLE_KEY,
    FOBLES_NAV_WARNING_VISIBLE_KEY,
    TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY,
    SHOW_RELOAD_EXTENSION_BUTTON_KEY,
  ])
  .then((result) => {
    if (visibilityCheckbox) {
      visibilityCheckbox.checked = result[FOBLES_NAV_VISIBLE_KEY] !== false;
    }
    if (warningCheckbox) {
      warningCheckbox.checked = result[FOBLES_NAV_WARNING_VISIBLE_KEY] !== false;
    }
    if (turnOffAfterNavigationCheckbox) {
      turnOffAfterNavigationCheckbox.checked =
        result[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY] === true;
    }
    if (reloadExtensionButton) {
      reloadExtensionButton.hidden = result[SHOW_RELOAD_EXTENSION_BUTTON_KEY] !== true;
    }
  });

visibilityCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [FOBLES_NAV_VISIBLE_KEY]: visibilityCheckbox.checked,
  });
});

warningCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [FOBLES_NAV_WARNING_VISIBLE_KEY]: warningCheckbox.checked,
  });
});

turnOffAfterNavigationCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY]:
      turnOffAfterNavigationCheckbox.checked,
  });
});

openOptionsButton?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

reloadExtensionButton?.addEventListener("click", () => {
  void chrome.runtime.sendMessage({ action: "reload-extension" });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  if (
    visibilityCheckbox &&
    typeof changes[FOBLES_NAV_VISIBLE_KEY]?.newValue === "boolean"
  ) {
    visibilityCheckbox.checked = changes[FOBLES_NAV_VISIBLE_KEY].newValue;
  }
  if (
    warningCheckbox &&
    typeof changes[FOBLES_NAV_WARNING_VISIBLE_KEY]?.newValue === "boolean"
  ) {
    warningCheckbox.checked = changes[FOBLES_NAV_WARNING_VISIBLE_KEY].newValue;
  }
  if (
    turnOffAfterNavigationCheckbox &&
    typeof changes[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY]?.newValue === "boolean"
  ) {
    turnOffAfterNavigationCheckbox.checked =
      changes[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY].newValue;
  }
  if (
    reloadExtensionButton &&
    typeof changes[SHOW_RELOAD_EXTENSION_BUTTON_KEY]?.newValue === "boolean"
  ) {
    reloadExtensionButton.hidden = changes[SHOW_RELOAD_EXTENSION_BUTTON_KEY].newValue !== true;
  }
});
