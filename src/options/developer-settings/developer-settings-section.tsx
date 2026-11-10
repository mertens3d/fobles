// @source-path [fobles] src/options/developer-settings/developer-settings-section.tsx

import { useEffect, useState } from "react";
import { CONST } from "../../constants/const";
import { getDebugSettings, setDebugSettings } from "../../shared/debug-settings";
import { type DebugSettings } from "../../shared/DebugSettings.types";

const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  debugLogging: false,
  persistDebugLogs: false,
  showReloadExtensionButton: false,
  showDeveloperButton: false,
};

export function DeveloperSettingsSection() {
  const [settings, setSettings] = useState<DebugSettings>(DEFAULT_DEBUG_SETTINGS);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void getDebugSettings().then(setSettings);
  }, []);

  function update(partial: Partial<DebugSettings>): void {
    setSettings((current) => ({ ...current, ...partial }));
  }

  async function handleSave(): Promise<void> {
    await setDebugSettings(settings);
    setStatus("Developer settings saved.");
  }

  return (
    <details className="settings-section">
      <summary>Developer Settings</summary>
      <p>These options are for local debugging and development only. Both default to off.</p>
      <label className="visibility-setting">
        <input
          id={CONST.FOBLES.OPTIONS_PAGE.DEBUG_LOGGING}
          type="checkbox"
          checked={settings.debugLogging}
          onChange={(event) => update({ debugLogging: event.target.checked })}
        />
        <span>Enable debug logging</span>
      </label>
      <label className="visibility-setting">
        <input
          id={CONST.FOBLES.OPTIONS_PAGE.SHOW_RELOAD_EXTENSION_BUTTON}
          type="checkbox"
          checked={settings.showReloadExtensionButton}
          onChange={(event) => update({ showReloadExtensionButton: event.target.checked })}
        />
        <span>Show Reload Extension button</span>
      </label>
      <label className="visibility-setting">
        <input
          id={CONST.FOBLES.OPTIONS_PAGE.SHOW_DEVELOPER_BUTTON}
          type="checkbox"
          checked={settings.showDeveloperButton}
          onChange={(event) => update({ showDeveloperButton: event.target.checked })}
        />
        <span>Show Developer button</span>
      </label>
      <label className="visibility-setting">
        <input
          id={CONST.FOBLES.OPTIONS_PAGE.PERSIST_DEBUG_LOGS}
          type="checkbox"
          checked={settings.persistDebugLogs}
          onChange={(event) => update({ persistDebugLogs: event.target.checked })}
        />
        <span>Persist debug logs</span>
      </label>
      <button id="save-debug-settings" type="button" className="settings-button" onClick={() => void handleSave()}>
        Save developer settings
      </button>
      <p id={CONST.FOBLES.OPTIONS_PAGE.DEBUG_STATUS} role="status">
        {status}
      </p>
    </details>
  );
}
