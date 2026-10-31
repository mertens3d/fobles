// @source-path [fobles] src/popup/popup-app.tsx

import { useEffect, useState } from "react";
import { MESSAGE } from "../constants/extension-const";
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
import { getDebugSettings, onShowReloadExtensionButtonChange } from "../shared/debug-settings";

export function PopupApp() {
  const [navVisible, setNavVisibleState] = useState(true);
  const [navWarningVisible, setNavWarningVisibleState] = useState(true);
  const [turnOffAfterNavigation, setTurnOffAfterNavigationState] = useState(false);
  const [showReloadExtensionButton, setShowReloadExtensionButton] = useState(false);

  useEffect(() => {
    void getFoblesNavVisible().then(setNavVisibleState);
    void getFoblesNavWarningVisible().then(setNavWarningVisibleState);
    void getTurnOffFoblesAfterNavigation().then(setTurnOffAfterNavigationState);
    void getDebugSettings().then((settings) => setShowReloadExtensionButton(settings.showReloadExtensionButton));
    onFoblesNavVisibleChange(setNavVisibleState);
    onFoblesNavWarningVisibleChange(setNavWarningVisibleState);
    onTurnOffFoblesAfterNavigationChange(setTurnOffAfterNavigationState);
    onShowReloadExtensionButtonChange(setShowReloadExtensionButton);
  }, []);

  function handleNavVisibleChange(checked: boolean): void {
    setNavVisibleState(checked);
    void setFoblesNavVisible(checked);
  }

  function handleNavWarningVisibleChange(checked: boolean): void {
    setNavWarningVisibleState(checked);
    void setFoblesNavWarningVisible(checked);
  }

  function handleTurnOffAfterNavigationChange(checked: boolean): void {
    setTurnOffAfterNavigationState(checked);
    void setTurnOffFoblesAfterNavigation(checked);
  }

  function handleReloadExtension(): void {
    void chrome.runtime.sendMessage({ action: MESSAGE.ACTION.RELOAD_EXTENSION });
  }

  function handleOpenOptions(): void {
    void chrome.runtime.openOptionsPage();
  }

  function handleViewPersistedLogs(): void {
    void chrome.tabs.create({ url: chrome.runtime.getURL("options.html#persisted-logs") });
  }

  return (
    <>
      <h1>Fobles</h1>
      <ol>
        <li>Set Site access in the browser&apos;s extension controls.</li>
        <li>Open a page on an approved Sitecore domain.</li>
        <li>In Chrome Extensions Shortcuts, verify or assign <span className="shortcut">Ctrl+Shift+E</span> for Toggle Fobles.</li>
      </ol>
      <p className="hint">Open <strong>chrome://extensions/shortcuts</strong> to manage shortcuts. On macOS, use Command+Shift+E.</p>
      <label className="visibility-setting">
        <input id="fobles-nav-visible" type="checkbox" checked={navVisible} onChange={(event) => handleNavVisibleChange(event.target.checked)} />
        <span>Fobles navigation visible</span>
      </label>
      <label className="visibility-setting">
        <input id="fobles-nav-warning-visible" type="checkbox" checked={navWarningVisible} onChange={(event) => handleNavWarningVisibleChange(event.target.checked)} />
        <span>Warn before same-tab Fobles navigation</span>
      </label>
      <label className="visibility-setting">
        <input id="turn-off-fobles-after-navigation" type="checkbox" checked={turnOffAfterNavigation} onChange={(event) => handleTurnOffAfterNavigationChange(event.target.checked)} />
        <span>Turn off Fobles after opening an item</span>
      </label>
      {showReloadExtensionButton && <button id="reload-extension" type="button" onClick={handleReloadExtension}>Reload Extension</button>}
      {showReloadExtensionButton && <button id="view-persisted-logs" type="button" onClick={handleViewPersistedLogs}>View Logs</button>}
      <button id="open-options" type="button" onClick={handleOpenOptions}>Additional Settings</button>
    </>
  );
}
