// @source-path [fobles] src/content/shared/error-manager/fobles-error-banner.tsx

import { useSyncExternalStore } from "react";
import { clearFoblesError, getFoblesErrorSnapshot, subscribeFoblesError } from "./error-manager";

export function FoblesErrorBanner() {
  const error = useSyncExternalStore(subscribeFoblesError, getFoblesErrorSnapshot);
  if (!error) {
    return null;
  }
  const details = [error.errorMessage, error.stack, error.context ? JSON.stringify(error.context, null, 2) : undefined].filter(Boolean).join("\n\n");
  return <div role="alert" style={{ position: "fixed", top: 12, right: 12, zIndex: 11000, maxWidth: 640, padding: "10px 12px", border: "1px solid #8b0000", borderRadius: 4, background: "#b91c1c", color: "#fff", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)", font: '12px/1.4 system-ui, "Segoe UI", Arial, sans-serif' }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
        <strong>Fobles error: {error.message}</strong>
        {details ? <pre style={{ maxHeight: 320, margin: "8px 0 0", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", font: "11px/1.35 Consolas, monospace" }}>{details}</pre> : null}
      </div>
      <button type="button" onClick={clearFoblesError} aria-label="Dismiss Fobles error" style={{ border: "1px solid rgba(255,255,255,.65)", borderRadius: 3, background: "transparent", color: "#fff", cursor: "pointer" }}>×</button>
    </div>
  </div>;
}
