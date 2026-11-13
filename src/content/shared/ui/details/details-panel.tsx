// @source-path [fobles] src/content/shared/ui/details/details-panel.tsx

import { DETAILS_PANEL } from "./details-panel.const";
import { CopyButton } from "./copy-button";
import type { DetailsPanelProps } from "./details-panel.types";

export function DetailsPanel({ title, getCopyText, actions, children }: DetailsPanelProps) {
  return <section className={`${DETAILS_PANEL.CLASS.ROOT} fobles-details-panel`}>
    <header className={`${DETAILS_PANEL.CLASS.HEADER} fobles-details-panel-header`}>
      {title ? <strong>{title}</strong> : null}
      <div className="fobles-details-panel-actions">{actions}{getCopyText ? <CopyButton getText={getCopyText} /> : null}</div>
    </header>
    <div className="fobles-details-panel-content">{children}</div>
  </section>;
}
