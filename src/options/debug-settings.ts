// @source-path [fobles] src/options/debug-settings.ts

import { getDebugSettings, setDebugSettings } from "../shared/debug-settings";
import { clearAllStorageValues, getAllStorageValues } from "../shared/storage/storage";
import { getElement } from "./dom-helpers";
import { clearPersistedLogEntries, getPersistedLogEntries } from "../shared/logging/persisted-log-storage";
import { LOGGER, STORAGE } from "../constants/extension-constants";

const debugLoggingInput = getElement<HTMLInputElement>("debug-logging");
const showReloadExtensionButtonInput = getElement<HTMLInputElement>("show-reload-extension-button");
const debugStatus = getElement<HTMLParagraphElement>("debug-status");
const viewStoredSettingsButton = getElement<HTMLButtonElement>("view-stored-settings");
const storedSettingsOutput = getElement<HTMLPreElement>("stored-settings-output");
const clearStoredSettingsButton = getElement<HTMLButtonElement>("clear-stored-settings");
const clearStoredSettingsStatus = getElement<HTMLParagraphElement>("clear-stored-settings-status");
const refreshPersistedLogsButton = getElement<HTMLButtonElement>("refresh-persisted-logs");
const persistedLogsOutput = getElement<HTMLDivElement>("persisted-logs-output");
const persistedLogsSection = getElement<HTMLDetailsElement>("persisted-logs");
const clearPersistedLogsButton = getElement<HTMLButtonElement>("clear-persisted-logs");
const persistDebugLogsInput = getElement<HTMLInputElement>("persist-debug-logs");
const scrollPersistedLogsBottomButton = getElement<HTMLButtonElement>("scroll-persisted-logs-bottom");

export function initDebugSettings(): void {

  const renderPersistedLogs = async (): Promise<void> => {
    const entries = await getPersistedLogEntries();

    persistedLogsOutput.replaceChildren();

    if (entries.length === 0) {
      persistedLogsOutput.textContent = "No persisted logs.";
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = `persisted-log-entry persisted-log-${entry.level}`;

      const timestamp = new Date(entry.timestamp);
      const time =
        `${String(timestamp.getMinutes()).padStart(2, "0")}:` +
        `${String(timestamp.getSeconds()).padStart(2, "0")}`;

      const primitives: string[] = [];
      const objects: unknown[] = [];

      entry.args.forEach((arg) => {
        if (
          arg !== null &&
          typeof arg === "object"
        ) {
          objects.push(arg);
        } else {
          primitives.push(String(arg));
        }
      });

      const line = document.createElement("div");
      line.className = "persisted-log-line";

      const prefix = document.createElement("span");
      prefix.className = "persisted-log-prefix";
      prefix.textContent =
        `${time} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}`;

      const message = document.createElement("span");
      message.className = "persisted-log-message";
      message.textContent =
        primitives.length > 0
          ? ` ${primitives.join(" ")}`
          : "";

      line.append(prefix, message);
      row.append(line);

      objects.forEach((value) => {
        const details = document.createElement("details");
        details.className = "persisted-log-object";

        const summary = document.createElement("summary");

        summary.textContent = Array.isArray(value)
          ? `Array(${value.length})`
          : "Object";

        const content = document.createElement("pre");
        content.textContent = JSON.stringify(
          value,
          null,
          2,
        );

        details.append(summary, content);
        row.append(details);
      });

      persistedLogsOutput.append(row);
    });
  };

  scrollPersistedLogsBottomButton.addEventListener("click", () => {
    persistedLogsOutput.lastElementChild?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  });

  clearPersistedLogsButton.addEventListener("click", () => {
    void clearPersistedLogEntries().then(() => {
      persistedLogsOutput.textContent = "No persisted logs.";
    });
  });

  persistedLogsSection.addEventListener("toggle", () => {
    if (persistedLogsSection.open) {
      void renderPersistedLogs();
    }
  });

  refreshPersistedLogsButton.addEventListener("click", () => {
    void renderPersistedLogs();
  });

  if (window.location.hash === "#persisted-logs") {
    persistedLogsSection.open = true;
    void renderPersistedLogs();
  }

  getElement<HTMLButtonElement>("save-debug-settings").addEventListener("click", () => {
    void setDebugSettings({
      debugLogging: debugLoggingInput.checked,
      persistDebugLogs: persistDebugLogsInput.checked,
      showReloadExtensionButton: showReloadExtensionButtonInput.checked,
    }).then(() => {
      debugStatus.textContent = "Developer settings saved.";
    });
  });

  void getDebugSettings().then((settings) => {
    debugLoggingInput.checked = settings.debugLogging;
    persistDebugLogsInput.checked = settings.persistDebugLogs;
    showReloadExtensionButtonInput.checked = settings.showReloadExtensionButton;
  });

  viewStoredSettingsButton.addEventListener("click", () => {

    void getAllStorageValues().then(({ sync, local }) => {
      const {
        [STORAGE.KEY.PERSISTED_LOG_ENTRIES]: persistedLogs,
        ...localSettings
      } = local;

      const displayValue = {
        sync,
        local: localSettings,
        persistedLogs: persistedLogs ?? [],
      };

      storedSettingsOutput.textContent =
        JSON.stringify(displayValue, null, 2);

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
