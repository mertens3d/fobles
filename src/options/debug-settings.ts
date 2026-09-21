import { getDebugSettings, setDebugSettings } from "../shared/debug-settings";
import { clearAllStorageValues, getAllStorageValues } from "../shared/storage/storage";
import { getElement } from "./dom-helpers";

const debugLoggingInput = getElement<HTMLInputElement>("debug-logging");
const showReloadExtensionButtonInput = getElement<HTMLInputElement>(
  "show-reload-extension-button",
);
const debugStatus = getElement<HTMLParagraphElement>("debug-status");
const viewStoredSettingsButton = getElement<HTMLButtonElement>("view-stored-settings");
const storedSettingsOutput = getElement<HTMLPreElement>("stored-settings-output");
const clearStoredSettingsButton = getElement<HTMLButtonElement>("clear-stored-settings");
const clearStoredSettingsStatus = getElement<HTMLParagraphElement>("clear-stored-settings-status");

export function initDebugSettings(): void {
  getElement<HTMLButtonElement>("save-debug-settings").addEventListener("click", () => {
    void setDebugSettings({
      debugLogging: debugLoggingInput.checked,
      showReloadExtensionButton: showReloadExtensionButtonInput.checked,
    }).then(() => {
      debugStatus.textContent = "Developer settings saved.";
    });
  });

  void getDebugSettings().then((settings) => {
    debugLoggingInput.checked = settings.debugLogging;
    showReloadExtensionButtonInput.checked = settings.showReloadExtensionButton;
  });

  viewStoredSettingsButton.addEventListener("click", () => {
    void getAllStorageValues().then(({ sync, local }) => {
      storedSettingsOutput.textContent = JSON.stringify({ sync, local }, null, 2);
      storedSettingsOutput.hidden = false;
    });
  });

  clearStoredSettingsButton.addEventListener("click", () => {
    if (!confirm("Clear all stored Fobles settings? This can't be undone.")) return;

    void clearAllStorageValues().then(() => {
      clearStoredSettingsStatus.textContent = "All stored settings cleared.";
      storedSettingsOutput.hidden = true;
      storedSettingsOutput.textContent = "";
    });
  });
}
