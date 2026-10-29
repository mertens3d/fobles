// @source-path [fobles] src/content/shared/ui/reference-model/reference-model-viewer.tsx

import { useState } from "react";
import { copySanitizedText, downloadSanitizedText } from "../../../../shared/export/text-export";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import { DialogIconButton } from "../dialog/dialog-icon-button";

const COPIED_FEEDBACK_DURATION_MS = 1500;
export const AUDITOR_EXPORT_CSV_EVENT = "fobles:auditor-export-csv";

export type ReferenceModelViewerProps = { referenceModel: ReferenceModelNode; onClose: () => void };

export function ReferenceModelViewer({ referenceModel, onClose }: ReferenceModelViewerProps) {
  const [copied, setCopied] = useState(false);
  const formattedJson = JSON.stringify(referenceModel, null, 2);

  async function handleCopy(): Promise<void> {
    await copySanitizedText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
  }

  function handleDownload(): void {
    downloadSanitizedText(document, formattedJson, `fobles-reference-model-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, "application/json;charset=utf-8");
  }

  return (
    <section className="fobles-reference-model-viewer">
      <header className="fobles-reference-model-viewer-header">
        <h2>Reference Model</h2>
        <div className="fobles-reference-model-viewer-actions">
          <button type="button" onClick={() => void handleCopy()}>{copied ? "Copied" : "Copy to Clipboard"}</button>
          <button type="button" onClick={handleDownload}>Download JSON</button>
          <button type="button" onClick={() => window.dispatchEvent(new Event(AUDITOR_EXPORT_CSV_EVENT))}>Export CSV</button>
          <DialogIconButton kind="close" label="Close Reference Model" surface="light" onClick={onClose} />
        </div>
      </header>
      <div className="fobles-reference-model-viewer-scroll">
        <pre>{formattedJson}</pre>
      </div>
    </section>
  );
}
