import { getElement } from "./dom-helpers";

const DEBUG_LOGGING_KEY = "debugLogging";
const SHOW_RELOAD_EXTENSION_BUTTON_KEY = "showReloadExtensionButton";

const debugLoggingInput = getElement<HTMLInputElement>("debug-logging");
const showReloadExtensionButtonInput = getElement<HTMLInputElement>(
  "show-reload-extension-button",
);
const debugStatus = getElement<HTMLParagraphElement>("debug-status");
const viewStoredSettingsButton = getElement<HTMLButtonElement>("view-stored-settings");
const storedSettingsOutput = getElement<HTMLPreElement>("stored-settings-output");

export function initDebugSettings(): void {
  getElement<HTMLButtonElement>("save-debug-settings").addEventListener("click", () => {
    void chrome.storage.sync
      .set({
        [DEBUG_LOGGING_KEY]: debugLoggingInput.checked,
        [SHOW_RELOAD_EXTENSION_BUTTON_KEY]:
          showReloadExtensionButtonInput.checked,
      })
      .then(() => {
        debugStatus.textContent = "Developer settings saved.";
      });
  });

  void chrome.storage.sync
    .get([DEBUG_LOGGING_KEY, SHOW_RELOAD_EXTENSION_BUTTON_KEY])
    .then((result) => {
      debugLoggingInput.checked = result[DEBUG_LOGGING_KEY] === true;
      showReloadExtensionButtonInput.checked =
        result[SHOW_RELOAD_EXTENSION_BUTTON_KEY] === true;
    });

  viewStoredSettingsButton.addEventListener("click", () => {
    void Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null),
    ]).then(([sync, local]) => {
      storedSettingsOutput.textContent = JSON.stringify({ sync, local }, null, 2);
      storedSettingsOutput.hidden = false;
    });
  });
}
