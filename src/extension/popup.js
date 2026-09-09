const FOBLE_NAV_VISIBLE_KEY = "fobleNavVisible";
const FOBLE_NAV_WARNING_VISIBLE_KEY = "fobleNavWarningVisible";
const TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY = "turnOffFoblesAfterNavigation";
const visibilityCheckbox = document.getElementById("foble-nav-visible");
const warningCheckbox = document.getElementById("foble-nav-warning-visible");
const turnOffAfterNavigationCheckbox = document.getElementById(
  "turn-off-fobles-after-navigation",
);
const openOptionsButton = document.getElementById("open-options");

void chrome.storage.sync
  .get([
    FOBLE_NAV_VISIBLE_KEY,
    FOBLE_NAV_WARNING_VISIBLE_KEY,
    TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY,
  ])
  .then((result) => {
    if (visibilityCheckbox) {
      visibilityCheckbox.checked = result[FOBLE_NAV_VISIBLE_KEY] !== false;
    }
    if (warningCheckbox) {
      warningCheckbox.checked = result[FOBLE_NAV_WARNING_VISIBLE_KEY] !== false;
    }
    if (turnOffAfterNavigationCheckbox) {
      turnOffAfterNavigationCheckbox.checked =
        result[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY] === true;
    }
  });

visibilityCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [FOBLE_NAV_VISIBLE_KEY]: visibilityCheckbox.checked,
  });
});

warningCheckbox?.addEventListener("change", () => {
  void chrome.storage.sync.set({
    [FOBLE_NAV_WARNING_VISIBLE_KEY]: warningCheckbox.checked,
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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  if (
    visibilityCheckbox &&
    typeof changes[FOBLE_NAV_VISIBLE_KEY]?.newValue === "boolean"
  ) {
    visibilityCheckbox.checked = changes[FOBLE_NAV_VISIBLE_KEY].newValue;
  }
  if (
    warningCheckbox &&
    typeof changes[FOBLE_NAV_WARNING_VISIBLE_KEY]?.newValue === "boolean"
  ) {
    warningCheckbox.checked = changes[FOBLE_NAV_WARNING_VISIBLE_KEY].newValue;
  }
  if (
    turnOffAfterNavigationCheckbox &&
    typeof changes[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY]?.newValue === "boolean"
  ) {
    turnOffAfterNavigationCheckbox.checked =
      changes[TURN_OFF_FOBLES_AFTER_NAVIGATION_KEY].newValue;
  }
});
