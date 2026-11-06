import { useEffect, useRef, useState } from "react";
import { readKnownSites, subscribeKnownSites } from "../../shared/known-sites/known-sites-repository.ts";
import type { KnownSite, KnownSitesChange } from "../../shared/structural/structural.types.ts";
import { KnownSiteEditor } from "./known-site-editor.tsx";
import { structuralError } from "./structural-options-model.ts";
import type { KnownSitesPanelProps } from "./structural-options.types.ts";
import { STRUCTURAL_OPTIONS } from "./structural-options.const.ts";
import { changeScopedKnownSites, changeScopedStructuralData } from "./structural-options-handlers.ts";
import { STRUCTURAL_COMMAND } from "../../shared/structural/structural.const.ts";
import type { StructuralAction } from "../../shared/structural/structural-command.types.ts";

export function KnownSitesPanel({ scope }: KnownSitesPanelProps) {
  const [sites, setSites] = useState<KnownSite[]>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeKnownSites(scope, (rows) => {
      revision.current += 1;
      setSites(rows);
    });
    const initialRevision = revision.current;
    void readKnownSites(scope).then((rows) => {
      if (active && initialRevision === revision.current) {
        setSites(rows);
      }
    }).catch((error: unknown) => {
      if (active) {
        setFailed(true);
        setStatus(structuralError(error));
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [scope]);

  async function handleChange(change: KnownSitesChange): Promise<void> {
    setBusy(true);
    setFailed(false);
    setStatus("");
    try {
      const initialRevision = revision.current;
      const rows = await changeScopedKnownSites(scope, change);
      if (revision.current === initialRevision) {
        setSites(rows);
      }
      setStatus("Known Sites updated for this Sitecore environment and database.");
    } catch (error) {
      setFailed(true);
      setStatus(structuralError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string): Promise<void> {
    if (confirm(`Remove this Known Site from ${scope.origin} / ${scope.database}?`)) {
      await handleChange({ action: "remove", id });
    }
  }

  async function handleStructural(action: StructuralAction): Promise<void> {
    setBusy(true);
    setFailed(false);
    setStatus("");
    try {
      const response = await changeScopedStructuralData(scope, action);
      setStatus(action === STRUCTURAL_COMMAND.ACTION.REDISCOVER
        ? `Structural data invalidated for this Sitecore environment and database; rediscovery scheduled for ${response.scheduled} unique roots/history items. Background discovery is not yet complete.`
        : STRUCTURAL_OPTIONS.INVALIDATED);
    } catch (error) {
      setFailed(true);
      setStatus(structuralError(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear(): Promise<void> {
    if (confirm(`Remove all Known Sites from ${scope.origin} / ${scope.database}? Other Sitecore environments and databases, and structural cache facts, are unchanged.`)) {
      await handleChange({ action: "clear" });
    }
  }

  return (
    <section aria-label="Known Sites for this Sitecore environment and database">
      <h3>{scope.origin} / {scope.database}</h3>
      <p>Known Sites are shared across languages for this Sitecore environment and database. Saving an edit updates its validation time; it does not verify the site in Sitecore.</p>
      {sites === undefined ? <p>Known Sites have not loaded.</p> : sites.length === 0 ? <p>No Known Sites for this Sitecore environment and database.</p> : sites.map((site) => (
        <KnownSiteEditor key={site.id} site={site} busy={busy}
          onSave={(value) => handleChange({ action: "upsert", site: value })} onRemove={handleRemove} />
      ))}
      <div className="button-row">
        <button type="button" className="remove" disabled={busy || !sites?.length} onClick={() => void handleClear()}>Remove all Known Sites</button>
        <button type="button" disabled={busy} onClick={() => void handleStructural(STRUCTURAL_COMMAND.ACTION.INVALIDATE)}>Invalidate structural cache</button>
        <button type="button" disabled={busy} onClick={() => void handleStructural(STRUCTURAL_COMMAND.ACTION.REDISCOVER)}>Rediscover structural data</button>
      </div>
      <p>{STRUCTURAL_OPTIONS.COMMAND_HELP}</p>
      <p role="status" className={failed ? "field-error" : undefined}>{status}</p>
    </section>
  );
}