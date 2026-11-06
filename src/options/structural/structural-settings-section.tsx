import { useEffect, useState } from "react";
import { getStructuralSettings, watchStructuralSettings } from "../../shared/structural/structural-settings.ts";
import { STRUCTURAL_OPTIONS } from "./structural-options.const.ts";
import { saveStructuralOptions } from "./structural-options-handlers.ts";
import { structuralError, structuralSettingsDraft } from "./structural-options-model.ts";
import type { StructuralSettingsDraft } from "./structural-options.types.ts";

export function StructuralSettingsSection() {
  const [draft, setDraft] = useState<StructuralSettingsDraft>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let settingsChanged = false;
    const unwatch = watchStructuralSettings((settings) => {
      settingsChanged = true;
      setDraft(structuralSettingsDraft(settings));
    });
    void getStructuralSettings().then((settings) => {
      if (active) {
        if (!settingsChanged) {
          setDraft(structuralSettingsDraft(settings));
        }
      }
    }).catch((error: unknown) => {
      if (active) {
        setFailed(true);
        setStatus(structuralError(error));
      }
    });
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  async function handleSave(): Promise<void> {
    if (draft) {
      setBusy(true);
      setFailed(false);
      setStatus("");
      try {
        await saveStructuralOptions(draft);
        setStatus(STRUCTURAL_OPTIONS.SAVED);
      } catch (error) {
        setFailed(true);
        setStatus(structuralError(error));
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <details className="settings-section">
      <summary>{STRUCTURAL_OPTIONS.TITLE}</summary>
      <p>Configure the base templates used to discover sites and identify pages and tenants. Cached results remain usable while they are refreshed.</p>
      <fieldset className="structural-fields" disabled={!draft || busy}>
        <p>Enter one full template path per line. An empty list explicitly disables that category's bases.</p>
        {STRUCTURAL_OPTIONS.PATH_FIELDS.map(({ kind, label }) => (
          <label key={kind}>
            {label}
            <textarea rows={3} value={draft?.paths[kind] ?? ""}
              onChange={(event) => setDraft((current) => current && ({ ...current, paths: { ...current.paths, [kind]: event.target.value } }))} />
          </label>
        ))}
        <label className="visibility-setting">
          <input type="checkbox" checked={draft?.showToolbarDiagnostics ?? false}
            onChange={(event) => setDraft((current) => current && ({ ...current, showToolbarDiagnostics: event.target.checked }))} />
          <span>{STRUCTURAL_OPTIONS.DIAGNOSTIC_LABEL}</span>
        </label>
        <p>Off by default. Shows structural work diagnostics in the toolbar without enabling debug logging or altering Sitecore editor settings.</p>
        <div className="settings-actions">
          <button type="button" className="settings-button" onClick={() => void handleSave()}>{STRUCTURAL_OPTIONS.SAVE_LABEL}</button>
        </div>
      </fieldset>
      <p role="status" className={failed ? "field-error" : undefined}>{status}</p>
    </details>
  );
}