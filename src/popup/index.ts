import { MESSAGE } from "../shared/constants";
import {
  getFoblesNavVisible,
  getFoblesNavWarningVisible,
  getTurnOffFoblesAfterNavigation,
  onFoblesNavVisibleChange,
  onFoblesNavWarningVisibleChange,
  onTurnOffFoblesAfterNavigationChange,
  setFoblesNavVisible,
  setFoblesNavWarningVisible,
  setTurnOffFoblesAfterNavigation,
} from "../shared/nav-settings";
import {
  getDebugSettings,
  onShowReloadExtensionButtonChange,
} from "../shared/debug-settings";

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

void getFoblesNavVisible().then((visible) => {
  if (visibilityCheckbox) visibilityCheckbox.checked = visible;
});

void getFoblesNavWarningVisible().then((visible) => {
  if (warningCheckbox) warningCheckbox.checked = visible;
});

void getTurnOffFoblesAfterNavigation().then((enabled) => {
  if (turnOffAfterNavigationCheckbox) turnOffAfterNavigationCheckbox.checked = enabled;
});

void getDebugSettings().then((settings) => {
  if (reloadExtensionButton) {
    reloadExtensionButton.hidden = !settings.showReloadExtensionButton;
  }
});

visibilityCheckbox?.addEventListener("change", () => {
  void setFoblesNavVisible(visibilityCheckbox.checked);
});

warningCheckbox?.addEventListener("change", () => {
  void setFoblesNavWarningVisible(warningCheckbox.checked);
});

turnOffAfterNavigationCheckbox?.addEventListener("change", () => {
  void setTurnOffFoblesAfterNavigation(turnOffAfterNavigationCheckbox.checked);
});

openOptionsButton?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

reloadExtensionButton?.addEventListener("click", () => {
  void chrome.runtime.sendMessage({ action: MESSAGE.ACTION.RELOAD_EXTENSION });
});

onFoblesNavVisibleChange((visible) => {
  if (visibilityCheckbox) visibilityCheckbox.checked = visible;
});

onFoblesNavWarningVisibleChange((visible) => {
  if (warningCheckbox) warningCheckbox.checked = visible;
});

onTurnOffFoblesAfterNavigationChange((enabled) => {
  if (turnOffAfterNavigationCheckbox) turnOffAfterNavigationCheckbox.checked = enabled;
});

onShowReloadExtensionButtonChange((visible) => {
  if (reloadExtensionButton) reloadExtensionButton.hidden = !visible;
});

