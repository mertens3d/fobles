// @source-path [fobles] src/options/browser-navigation/browser-navigation-section.tsx
import { useEffect, useState } from "react";
import { getBrowserNavigationHistoryEnabled, setBrowserNavigationHistoryEnabled } from "../../shared/browser-navigation-settings";

export function BrowserNavigationSection() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void getBrowserNavigationHistoryEnabled().then(setEnabled);
  }, []);

  async function handleSave(): Promise<void> {
    await setBrowserNavigationHistoryEnabled(enabled);
    setStatus("Browser navigation history setting saved.");
  }

  return (
    <details className="settings-section">
      <summary>Browser Navigation</summary>
      <label className="visibility-setting">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span>Keep the browser address and navigation history synchronized with the current Sitecore item</span>
      </label>
      <p>Off by default. Updates the fo address value without reloading when the active item changes.</p>
      <button type="button" className="settings-button" onClick={() => void handleSave()}>Save browser navigation setting</button>
      <p role="status">{status}</p>
    </details>
  );
}
