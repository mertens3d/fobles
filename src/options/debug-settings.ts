// @source-path [fobles] src/options/debug-settings.ts
import { CONST } from "../constants/const";
import { LOGGER, STORAGE } from "../constants/extension-const";
import { getDebugSettings, setDebugSettings } from "../shared/debug-settings";
import { downloadSanitizedTextZip } from "../shared/export/zip-export";
import { copySanitizedText } from "../shared/export/text-export";
import { clearPersistedLogEntries, getPersistedLogEntries } from "../shared/logging/persisted-log-storage";
import { clearAllStorageValues, getAllStorageValues } from "../shared/storage/storage";
import { getElement } from "./dom-helpers";
const debugLoggingInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.DEBUG_LOGGING);
const showReloadExtensionButtonInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.SHOW_RELOAD_EXTENSION_BUTTON);
const showDeveloperButtonInput = getElement<HTMLInputElement>(CONST.FOBLES.OPTIONS_PAGE.SHOW_DEVELOPER_BUTTON);
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
function logTimeStamp(timestamp: Date): string { return `${String(timestamp.getMinutes()).padStart(2, "0")}:${String(timestamp.getSeconds()).padStart(2, "0")}`; }
async function formatPersistedLogs(): Promise<string> {
  const entries = await getPersistedLogEntries();
  if (entries.length === 0) return "No persisted logs.";
  return entries.map((entry) => {
    const timestamp = logTimeStamp(new Date(entry.timestamp));
    const primitives: string[] = [];
    const objects: unknown[] = [];
    entry.args.forEach((arg) => { if (arg !== null && typeof arg === "object") objects.push(arg); else primitives.push(String(arg)); });
    const line = `${timestamp} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}${primitives.length > 0 ? ` ${primitives.join(" ")}` : ""}`;
    const details = objects.map((value) => JSON.stringify(value, null, 2).split("\n").map((detailLine) => `  ${detailLine}`).join("\n"));
    return [line, ...details].join("\n");
  }).join("\n");
}
export function initDebugSettings(): void {
  const copySanitizedLogsButton = document.createElement("button");
  copySanitizedLogsButton.type = "button";
  copySanitizedLogsButton.textContent = "Copy Sanitized Logs";
  copySanitizedLogsButton.title = "Copies logs after redacting credentials and environment-sensitive values.";
  const downloadLogsZipButton = document.createElement("button");
  downloadLogsZipButton.type = "button";
  downloadLogsZipButton.textContent = "Download Logs for AI";
  downloadLogsZipButton.title = "Downloads sanitized logs as a ZIP with a .txt suffix for easier AI attachment.";
  copyPersistedLogsButton.insertAdjacentElement("afterend", copySanitizedLogsButton);
  copySanitizedLogsButton.insertAdjacentElement("afterend", downloadLogsZipButton);
  const renderPersistedLogsHTML = async (): Promise<void> => {
    const entries = await getPersistedLogEntries();
    persistedLogsOutput.replaceChildren();
    if (entries.length === 0) { persistedLogsOutput.textContent = "No persisted logs."; return; }
    entries.forEach((entry) => {
      const row = document.createElement("div"); row.className = `persisted-log-entry persisted-log-${entry.level}`;
      const primitives: string[] = []; const objects: unknown[] = [];
      entry.args.forEach((arg) => { if (arg !== null && typeof arg === "object") objects.push(arg); else primitives.push(String(arg)); });
      const line = document.createElement("div"); line.className = "persisted-log-line";
      const prefix = document.createElement("span"); prefix.className = "persisted-log-prefix"; prefix.textContent = `${logTimeStamp(new Date(entry.timestamp))} [${entry.level}] [${entry.context}] ${LOGGER.NAMESPACE}`;
      const message = document.createElement("span"); message.className = "persisted-log-message"; message.textContent = primitives.length > 0 ? ` ${primitives.join(" ")}` : "";
      line.append(prefix, message); row.append(line);
      objects.forEach((value) => { const details = document.createElement("details"); details.className = "persisted-log-object"; const summary = document.createElement("summary"); summary.textContent = Array.isArray(value) ? `Array(${value.length})` : "Object"; const content = document.createElement("pre"); content.textContent = JSON.stringify(value, null, 2); details.append(summary, content); row.append(details); });
      persistedLogsOutput.append(row);
    });
  };
  copyPersistedLogsButton.addEventListener("click", () => {
    void formatPersistedLogs().then((logs) => navigator.clipboard.writeText(logs)).then(() => {
      copyPersistedLogsButton.textContent = "Copied!";
      window.setTimeout(() => { copyPersistedLogsButton.textContent = "Copy Logs"; }, 1500);
    });
  });
  copySanitizedLogsButton.addEventListener("click", () => {
    void formatPersistedLogs().then(copySanitizedText).then(() => {
      copySanitizedLogsButton.textContent = "Copied!";
      window.setTimeout(() => { copySanitizedLogsButton.textContent = "Copy Sanitized Logs"; }, 1500);
    });
  });
  downloadLogsZipButton.addEventListener("click", () => { void formatPersistedLogs().then((logs) => { const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); downloadSanitizedTextZip(document, [{ path: "logs/persisted-logs.txt", content: logs }], `fobles-logs-for-ai-${timestamp}.zip.txt`); }); });
  scrollPersistedLogsBottomButton.addEventListener("click", () => { persistedLogsOutput.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" }); });
  clearPersistedLogsButton.addEventListener("click", () => { void clearPersistedLogEntries().then(() => { persistedLogsOutput.textContent = "No persisted logs."; }); });
  persistedLogsSection.addEventListener("toggle", () => { if (persistedLogsSection.open) void renderPersistedLogsHTML(); });
  refreshPersistedLogsButton.addEventListener("click", () => { void renderPersistedLogsHTML(); });
  if (window.location.hash === "#persisted-logs") { persistedLogsSection.open = true; void renderPersistedLogsHTML(); }
  getElement<HTMLButtonElement>("save-debug-settings").addEventListener("click", () => { void setDebugSettings({ debugLogging: debugLoggingInput.checked, persistDebugLogs: persistDebugLogsInput.checked, showReloadExtensionButton: showReloadExtensionButtonInput.checked, showDeveloperButton: showDeveloperButtonInput.checked }).then(() => { debugStatus.textContent = "Developer settings saved."; }); });
  void getDebugSettings().then((settings) => { debugLoggingInput.checked = settings.debugLogging; persistDebugLogsInput.checked = settings.persistDebugLogs; showReloadExtensionButtonInput.checked = settings.showReloadExtensionButton; showDeveloperButtonInput.checked = settings.showDeveloperButton; });
  viewStoredSettingsButton.addEventListener("click", () => { void getAllStorageValues().then(({ sync, local }) => { const { [STORAGE.KEY.PERSISTED_LOG_ENTRIES]: persistedLogs, ...localSettings } = local; storedSettingsOutput.textContent = JSON.stringify({ sync, local: localSettings, persistedLogs: persistedLogs ?? [] }, null, 2); storedSettingsOutput.hidden = false; }); });
  clearStoredSettingsButton.addEventListener("click", () => { if (!confirm("Clear all stored Fobles settings? This can't be undone.")) return; void clearAllStorageValues().then(() => { clearStoredSettingsStatus.textContent = "All stored settings cleared."; storedSettingsOutput.hidden = true; storedSettingsOutput.textContent = ""; }); });
}
