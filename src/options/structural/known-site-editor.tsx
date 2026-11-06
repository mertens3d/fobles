import { useEffect, useState } from "react";
import type { KnownSiteEditorProps } from "./structural-options.types.ts";

export function KnownSiteEditor({ busy, onRemove, onSave, site }: KnownSiteEditorProps) {
  const [draft, setDraft] = useState(site);
  const validatedDate = new Date(site.validatedAt);
  const validDate = Number.isFinite(validatedDate.getTime());
  useEffect(() => setDraft(site), [site]);

  return (
    <details className="known-site-row">
      <summary>{site.name} — {site.path}</summary>
      <p>Item ID: <code>{site.id}</code></p>
      <p>Last validated: <time dateTime={validDate ? validatedDate.toISOString() : undefined}>{validDate ? validatedDate.toLocaleString() : "Unavailable"}</time></p>
      <fieldset className="structural-fields" disabled={busy}>
        <label>Site name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Site path<input value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} /></label>
        <label>Template ID<input value={draft.templateId} onChange={(event) => setDraft({ ...draft, templateId: event.target.value })} /></label>
        <div className="button-row">
          <button type="button" onClick={() => void onSave(draft)}>Save site</button>
          <button type="button" className="remove" onClick={() => void onRemove(site.id)}>Remove site</button>
        </div>
      </fieldset>
    </details>
  );
}