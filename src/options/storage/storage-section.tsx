// @source-path [fobles] src/options/storage/storage-section.tsx

import { useState } from "react";
import { CONST } from "../../constants/const";
import { STORAGE } from "../../constants/extension.const";
import { clearAllStorageValues, getAllStorageValues } from "../../shared/storage/storage";

export function StorageSection() {
  const [output, setOutput] = useState<string>();
  const [clearStatus, setClearStatus] = useState("");

  async function handleView(): Promise<void> {
    const { sync, local } = await getAllStorageValues();
    const { [STORAGE.KEY.PERSISTED_LOG_ENTRIES]: persistedLogs, ...localSettings } = local;
    setOutput(JSON.stringify({ sync, local: localSettings, persistedLogs: persistedLogs ?? [] }, null, 2));
  }

  async function handleClear(): Promise<void> {
    if (!confirm("Clear all stored Fobles settings? This can't be undone.")) {
      return;
    }
    await clearAllStorageValues();
    setClearStatus("All stored settings cleared.");
    setOutput(undefined);
  }

  return (
    <details className="settings-section">
      <summary>Storage</summary>
      <p>View or clear everything Fobles has stored for you - not just developer settings.</p>
      <div className="button-row">
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.VIEW_STORED_SETTINGS}
          type="button"
          className="settings-button"
          onClick={() => void handleView()}
        >
          View Fobles Storage
        </button>
        <button
          id={CONST.FOBLES.OPTIONS_PAGE.CLEAR_STORED_SETTINGS}
          type="button"
          className="settings-button"
          onClick={() => void handleClear()}
        >
          Clear all stored settings
        </button>
      </div>
      <pre id={CONST.FOBLES.OPTIONS_PAGE.STORED_SETTINGS_OUTPUT} hidden={output === undefined}>
        {output}
      </pre>
      <p id={CONST.FOBLES.OPTIONS_PAGE.CLEAR_STORED_SETTINGS_STATUS} role="status">
        {clearStatus}
      </p>
    </details>
  );
}
