// @source-path [fobles] src/content/features/auditor/components/auditor-help-dialog/auditor-help-dialog.tsx
import { DialogIconButton } from "../../../../shared/ui/dialog/dialog-icon-button";

export type AuditorHelpDialogProps = { open: boolean; onClose: () => void };

export function AuditorHelpDialog({ open, onClose }: AuditorHelpDialogProps) {
  if (!open) return null;
  return (
    <div className="fobles-auditor-help-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="fobles-auditor-help" role="dialog" aria-modal="true" aria-label="Auditor help">
        <header className="fobles-auditor-help-header"><h2>Fobles Auditor</h2><DialogIconButton kind="close" label="Close Auditor help" onClick={onClose} /></header>
        <div className="fobles-auditor-help-body">
          <p>Inspect the Reference Model as a Sitecore-style tree with tests attached to the exact item or relationship they evaluate.</p>
          <h3>Tree shortcuts</h3>
          <dl className="fobles-auditor-help-list">
            <div><dt>Click glyph</dt><dd>Expand or collapse one node.</dd></div><div><dt>Double-click row</dt><dd>Expand or collapse that row.</dd></div>
            <div><dt>Ctrl/Cmd + double-click row</dt><dd>Apply the same state to every node in that semantic category.</dd></div>
            <div><dt>Shift + click</dt><dd>Expand or collapse the selected subtree.</dd></div><div><dt>View Data</dt><dd>Open a right-side details panel without resizing the audit table.</dd></div>
            <div><dt>Status icon</dt><dd>Open all test results for that item or relationship.</dd></div>
          </dl>
          <h3>Data journey</h3>
          <ul className="fobles-auditor-help-key">
            <li><span className="fobles-auditor-journey fobles-auditor-journey--referenced"><span className="is-complete" /><span /><span /><span /></span><span><strong>Referenced</strong> Discovered from the target or another relationship.</span></li>
            <li><span className="fobles-auditor-journey fobles-auditor-journey--cached"><span className="is-complete" /><span className="is-complete" /><span /><span /></span><span><strong>Cached</strong> Facts were supplied by the Sitecore data cache.</span></li>
            <li><span className="fobles-auditor-journey fobles-auditor-journey--live"><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /><span /></span><span><strong>Live</strong> Sitecore was queried during this operation.</span></li>
            <li><span className="fobles-auditor-journey fobles-auditor-journey--tested"><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /></span><span><strong>Tested</strong> Audit checks completed for the node.</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
