// @source-path [fobles] src/content/shared/ui/details/details-panel.tsx
import { useCallback, useState } from "react";
import { DETAILS_PANEL } from "./details-panel.const";
import type { DetailsPanelProps } from "./details-panel.types";

export function DetailsPanel({ title, getCopyText, actions, children }: DetailsPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((): void => {
    if (!getCopyText) {
      return;
    }
    void navigator.clipboard.writeText(getCopyText()).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), DETAILS_PANEL.COPIED_RESET_MS);
    });
  }, [getCopyText]);

  return <section className={`${DETAILS_PANEL.CLASS.ROOT} fobles-details-panel`}>
    <header className={`${DETAILS_PANEL.CLASS.HEADER} fobles-details-panel-header`}>
      <strong>{title}</strong>
      <div className="fobles-details-panel-actions">
        {actions}
        {getCopyText ? <button type="button" className={DETAILS_PANEL.CLASS.COPY} onClick={handleCopy}>{copied ? DETAILS_PANEL.TEXT.COPIED : DETAILS_PANEL.TEXT.COPY}</button> : null}
      </div>
    </header>
    <div className="fobles-details-panel-content">{children}</div>
  </section>;
}
