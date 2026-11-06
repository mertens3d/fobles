import { useEffect, useState } from "react";
import { normalizeHistoryScope } from "../../shared/item-history/item-history-model.ts";
import { knownSitesStorageKey } from "../../shared/known-sites/known-sites-model.ts";
import type { StructuralScope } from "../../shared/structural/structural.types.ts";
import { KnownSitesPanel } from "./known-sites-panel.tsx";
import { STRUCTURAL_OPTIONS } from "./structural-options.const.ts";
import { readKnownSiteScopes } from "./structural-options-handlers.ts";
import { structuralError } from "./structural-options-model.ts";

export function KnownSitesSection() {
  const [origin, setOrigin] = useState("");
  const [database, setDatabase] = useState("");
  const [scope, setScope] = useState<StructuralScope>();
  const [scopes, setScopes] = useState<StructuralScope[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void readKnownSiteScopes().then((rows) => {
      if (active) {
        setScopes(rows);
      }
    }).catch((reason: unknown) => {
      if (active) {
        setError(structuralError(reason));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function handleInspect(): void {
    setError("");
    try {
      const normalized = normalizeHistoryScope({ origin, database });
      setOrigin(normalized.origin);
      setDatabase(normalized.database);
      setScope(normalized);
    } catch {
      setScope(undefined);
      setError(STRUCTURAL_OPTIONS.INVALID_ENVIRONMENT);
    }
  }

  return (
    <details className="settings-section">
      <summary>{STRUCTURAL_OPTIONS.KNOWN_SITES_TITLE}</summary>
      <p>Select a stored Sitecore environment and database, or enter them below. Include the port if needed; all languages share Known Sites.</p>
      <label>Stored Sitecore environment and database
        <select value={scope ? knownSitesStorageKey(scope) : ""} onChange={(event) => {
          const selected = scopes.find((candidate) => knownSitesStorageKey(candidate) === event.target.value);
          if (selected) {
            setOrigin(selected.origin);
            setDatabase(selected.database);
            setScope(selected);
            setError("");
          }
        }}>
          <option value="">Choose a Sitecore environment and database</option>
          {scopes.map((value) => <option key={knownSitesStorageKey(value)} value={knownSitesStorageKey(value)}>{value.origin} / {value.database}</option>)}
        </select>
      </label>
      <div className="structural-scope-fields">
        <label>Sitecore environment URL<input type="url" value={origin} onChange={(event) => {
          setOrigin(event.target.value);
          setScope(undefined);
        }} /></label>
        <label>Database<input value={database} onChange={(event) => {
          setDatabase(event.target.value);
          setScope(undefined);
        }} /></label>
        <button type="button" onClick={handleInspect}>Inspect Known Sites</button>
      </div>
      <p role="status" className="field-error">{error}</p>
      {scope && <KnownSitesPanel key={knownSitesStorageKey(scope)} scope={scope} />}
    </details>
  );
}