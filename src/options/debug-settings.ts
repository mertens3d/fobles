// @source-path [fobles] src/options/debug-settings.ts

import { getDebugSettings, setDebugSettings } from "../shared/debug-settings";
import { clearAllStorageValues, getAllStorageValues } from "../shared/storage/storage";
import { getElement } from "./dom-helpers";
import { clearPersistedLogEntries, getPersistedLogEntries } from "../shared/logging/persisted-log-storage";
import { LOGGER, STORAGE } from "../constants/extension-const";
import { CONST } from "../constants/const";

const debugLoggingInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.DEBUG_LOGGING);
const showReloadExtensionButtonInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.SHOW_RELOAD_EXTENSION_BUTTON);
const debugStatus = getElement<HTMLParagraphElement>(CONST.FOBLES.OPTIONS_PAGE.DEBUG_STATUS);
const viewStoredSettingsButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.VIEW_STORED_SETTINGS);
const storedSettingsOutput = getElement<HTMLPreElement>(CONST.FOBLES.OPTIONS_PAGE.STORED_SETTINGS_OUTPUT);
const clearStoredSettingsButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.CLEAR_STORED_SETTINGS);
const clearStoredSettingsStatus = getElement<HTMLParagraphElement>(CONST.FOBLES.OPTIONS_PAGE.CLEAR_STORED_SETTINGS_STATUS);
const refreshPersistedLogsButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.REFRESH_PERSISTED_LOGS);
const persistedLogsOutput = getElement<HTMLDivElement>(CONST.FOBLES.OPTIONS_PAGE.PERSISTED_LOGS_OUTPUT);
const persistedLogsSection = getElement<HTMLDetailsElement>(CONST.FOBLES.OPTIONS_PAGE.PERSISTED_LOGS_SECTION);
const clearPersistedLogsButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.CLEAR_PERSISTED_LOGS);
const persistDebugLogsInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.PERSIST_DEBUG_LOGS);
const scrollPersistedLogsBottomButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.SCROLL_PERSISTED_LOGS_BOTTOM);
const copyPersistedLogsButton = getElement<HTMLButtonElement>(CONST.FOBLES.OPTIONS_PAGE.COPY_PERSISTED_LOGS);


export function initDebugSettings(): void {

  const renderPersistedLogsHTML = async (): Promise<void> => {
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
      const time = logTimeStamp(timestamp);

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

  copyPersistedLogsButton.addEventListener("click", () => {
    const logs = persistedLogsOutput.textContent;
    if (logs) {

      void navigator.clipboard.writeText(logs)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => {
            setCopied(false);
          }, 1500);
        });
    }
  });

  const logTimeStamp = (timestamp: Date): string =>
    `${String(timestamp.getMinutes()).padStart(2, "0")}:` +
    `${String(timestamp.getSeconds()).padStart(2, "0")}`;

  type logJson = {
    timestamp: string;
    textContent: string;
    details: object[];
  }
  type logsJson = logJson[];

  const formatPersistedLogsForClipboard = async (): Promise<string> => {
    const entries = await getPersistedLogEntries();

    if (entries.length === 0) {
      return "No persisted logs.";
    }

    return entries
      .map((entry) => {
        const timestamp = logTimeStamp(new Date(entry.timestamp));
        const primitives: string[] = [];
        const objects: unknown[] = [];

        entry.args.forEach((arg) => {
          if (arg !== null && typeof arg === "object") {
            objects.push(arg);
          } else {
            primitives.push(String(arg));
          }
        });

        const line =
          `${timestamp} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}` +
          (primitives.length > 0 ? ` ${primitives.join(" ")}` : "");

        const details = objects.map((value) =>
          JSON.stringify(value, null, 2)
            .split("\n")
            .map((line) => `  ${line}`)
            .join("\n"),
        );


        return [line, ...details].join("\n");
      })
      .join("\n");
  };


  const setCopied = (copied: boolean) => {
    copyPersistedLogsButton.textContent = copied ? "Copied!" : "Copy Persisted Logs";
  };
  copyPersistedLogsButton.addEventListener("click", () => {
    void formatPersistedLogsForClipboard()
      .then((logs) => navigator.clipboard.writeText(logs))
      .then(() => {
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1500);
      });
  });

  copyPersistedLogsButton.addEventListener("click", () => {
    const logs = persistedLogsOutput.textContent;
    if (logs) {

      void navigator.clipboard.writeText(logs)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => {
            setCopied(false);
          }, 1500);
        });
    }
  });



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
      void renderPersistedLogsHTML();
    }
  });

  refreshPersistedLogsButton.addEventListener("click", () => {
    void renderPersistedLogsHTML();
  });

  if (window.location.hash === "#persisted-logs") {
    persistedLogsSection.open = true;
    void renderPersistedLogsHTML();
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
