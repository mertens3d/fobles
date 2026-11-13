// @source-path [fobles] src/content/shared/ui/collapsible-section/collapsible-section.tsx

import type { ReactNode } from "react";

export type CollapsibleSectionProps = { title: string; expanded: boolean; onExpandedChange: (expanded: boolean) => void; children: ReactNode };

export function CollapsibleSection({ title, expanded, onExpandedChange, children }: CollapsibleSectionProps) {
  return <section className={`fobles-collapsible-section${expanded ? " is-expanded" : ""}`}>
    <button type="button" className="fobles-collapsible-section-toggle" aria-expanded={expanded} onClick={() => onExpandedChange(!expanded)}>
      <span className="fobles-collapsible-section-chevron" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
      <span>{title}</span>
    </button>
    {expanded ? <div className="fobles-collapsible-section-content">{children}</div> : null}
  </section>;
}
