// @source-path [fobles] src/content/features/auditor/components/auditor-dialog.tsx
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { showFoblesCleanupDialog } from "../../../../shared/error-dialog";
import { createDialogCloseButton } from "../../../shared/dialog/dialog-close-button";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";
import type { AuditFindingStore } from "../audit-finding-store";
import { downloadAuditFindingsCsv } from "../export/audit-csv-exporter";
import { AuditorGrid } from "./auditor-grid";
import { AuditorSummary } from "./auditor-summary";
import { AuditorToolbar } from "./auditor-toolbar";
export const AUDITOR_DIALOG_ID = "fobles-auditor-dialog";
type AuditorAppProps = { doc: Document; findingStore: AuditFindingStore; };
function AuditorApp({ doc, findingStore }: AuditorAppProps) {
  const [snapshot, setSnapshot] = useState<readonly AuditFinding[]>(() => findingStore.getSnapshot());
  const [query, setQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<ReadonlySet<AuditFindingStatus>>(() => new Set());
  const [selectedChecks, setSelectedChecks] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => findingStore.subscribe(setSnapshot), [findingStore]);
  const visibleFindings = useMemo(() => {
    const byStatus = selectedStatuses.size === 0 ? snapshot : snapshot.filter((finding) => selectedStatuses.has(finding.status));
    const byCheck = selectedChecks.size === 0 ? byStatus : byStatus.filter((finding) => selectedChecks.has(finding.checkKey));
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery ? byCheck.filter((finding) => [finding.itemId, finding.itemName, finding.itemPath, finding.checkLabel, finding.context, finding.summary, finding.details].filter((value): value is string => Boolean(value)).join("\n").toLowerCase().includes(normalizedQuery)) : byCheck;
  }, [snapshot, selectedStatuses, selectedChecks, query]);
  const summary = useMemo(() => { const counts = { pending: 0, passed: 0, warning: 0, error: 0, total: snapshot.length }; snapshot.forEach((finding) => { counts[finding.status] += 1; }); return counts; }, [snapshot]);
  function toggleStatus(status: AuditFindingStatus): void { setSelectedStatuses((previous) => { const next = new Set(previous); if (next.has(status)) next.delete(status); else next.add(status); return next; }); }
  function toggleCheck(checkKey: string): void { setSelectedChecks((previous) => { const next = new Set(previous); if (next.has(checkKey)) next.delete(checkKey); else next.add(checkKey); return next; }); }
  function exportCsv(): void { downloadAuditFindingsCsv(doc, visibleFindings, `fobles-auditor-findings-${Date.now()}.csv`); }
  return <div className="fobles-auditor-app"><AuditorSummary counts={summary} /><AuditorToolbar query={query} onQueryChange={setQuery} selectedStatuses={selectedStatuses} onToggleStatus={toggleStatus} selectedChecks={selectedChecks} onToggleCheck={toggleCheck} onExport={exportCsv} /><AuditorGrid findings={visibleFindings} /></div>;
}
export function openAuditorDialog(doc: Document, findingStore: AuditFindingStore, onCancelRequested: () => Promise<void>): Promise<void> {
  doc.getElementById(AUDITOR_DIALOG_ID)?.remove();
  return new Promise<void>((resolve) => {
    const dialog = doc.createElement("dialog"); dialog.id = AUDITOR_DIALOG_ID; dialog.className = "fobles-auditor-dialog";
    const closeButton = createDialogCloseButton(doc, dialog); const appHost = doc.createElement("div"); appHost.style.cssText = "position:relative;width:100%;height:100%;"; const appRoot = createRoot(appHost);
    dialog.append(closeButton, appHost); doc.body.appendChild(dialog);
    dialog.addEventListener("close", () => { void (async () => { const cleanupDialog = showFoblesCleanupDialog(doc); try { await onCancelRequested(); } finally { if (cleanupDialog.isConnected) cleanupDialog.close(); appRoot.unmount(); dialog.remove(); resolve(); } })(); }, { once: true });
    dialog.showModal(); appRoot.render(<AuditorApp doc={doc} findingStore={findingStore} />);
  });
}
