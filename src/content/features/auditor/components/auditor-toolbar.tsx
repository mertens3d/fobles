// @source-path [fobles] src/content/features/auditor/components/auditor-toolbar.tsx

import type { AuditFindingStatus } from "../audit-finding.types";
import { CACHE_VALIDATION_CHECK_KEY, CACHE_VALIDATION_CHECK_LABEL } from "../checks/cache-validation-check";
import { ITEM_NAVIGATION_CHECK_KEY, ITEM_NAVIGATION_CHECK_LABEL } from "../checks/item-navigation-check";
import { ITEM_RESOLVED_CHECK_KEY, ITEM_RESOLVED_CHECK_LABEL } from "../checks/item-resolved-check";
import { REFERENCE_RESOLVED_CHECK_KEY, REFERENCE_RESOLVED_CHECK_LABEL } from "../checks/reference-resolved-check";

const STATUS_OPTIONS: readonly AuditFindingStatus[] = ["pending", "error", "warning", "passed"];

const CHECK_OPTIONS: readonly { key: string; label: string }[] = [
  { key: ITEM_RESOLVED_CHECK_KEY, label: ITEM_RESOLVED_CHECK_LABEL },
  { key: REFERENCE_RESOLVED_CHECK_KEY, label: REFERENCE_RESOLVED_CHECK_LABEL },
  { key: CACHE_VALIDATION_CHECK_KEY, label: CACHE_VALIDATION_CHECK_LABEL },
  { key: ITEM_NAVIGATION_CHECK_KEY, label: ITEM_NAVIGATION_CHECK_LABEL },
];

export type AuditorToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  selectedStatuses: ReadonlySet<AuditFindingStatus>;
  onToggleStatus: (status: AuditFindingStatus) => void;
  selectedChecks: ReadonlySet<string>;
  onToggleCheck: (checkKey: string) => void;
  onExport: () => void;
};

// Fobles-owned search/filter UI - deliberately not AG Grid Enterprise Find, so Community stays
// sufficient and the search/filter semantics stay identical to what audit-finding-store exposes.
export function AuditorToolbar(props: AuditorToolbarProps) {
  return (
    <div className="fobles-auditor-toolbar">
      <input
        type="search"
        className="fobles-auditor-toolbar-search"
        placeholder="Search findings..."
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
        aria-label="Search findings"
      />
      <div className="fobles-auditor-toolbar-filters" role="group" aria-label="Filter by status">
        {STATUS_OPTIONS.map((status) => (
          <label key={status} className="fobles-auditor-toolbar-filter">
            <input type="checkbox" checked={props.selectedStatuses.has(status)} onChange={() => props.onToggleStatus(status)} />
            {status}
          </label>
        ))}
      </div>
      <div className="fobles-auditor-toolbar-filters" role="group" aria-label="Filter by check">
        {CHECK_OPTIONS.map((check) => (
          <label key={check.key} className="fobles-auditor-toolbar-filter">
            <input type="checkbox" checked={props.selectedChecks.has(check.key)} onChange={() => props.onToggleCheck(check.key)} />
            {check.label}
          </label>
        ))}
      </div>
      <button type="button" className="fobles-auditor-toolbar-export" onClick={props.onExport}>Export CSV</button>
    </div>
  );
}
