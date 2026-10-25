import { useState } from "react";
import { ICONS } from "../../../../constants/fobles.constants";
import { copySanitizedText, downloadSanitizedText } from "../../../../shared/export/text-export";
import type { ReferenceModelNode } from "../reference-model.types";

const COPIED_FEEDBACK_DURATION_MS = 1500;

export type ReferenceModelViewerProps = { referenceModel: ReferenceModelNode; onClose: () => void; };

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
    <div className="fobles-reference-model-viewer">
      <div className="fobles-reference-model-viewer-actions">
        <button type="button" className="fobles-reference-model-viewer-copy" onClick={() => { void handleCopy(); }}>{copied ? "Copied" : "Copy to Clipboard"}</button>
        <button type="button" className="fobles-reference-model-viewer-download" onClick={handleDownload}>Download JSON</button>
        <button type="button" className="fobles-reference-model-viewer-close" title="Close" aria-label="Close" onClick={onClose}>
          <img className="fobles-reference-model-viewer-close-icon" src={ICONS.CLOSE} alt="" />
        </button>
      </div>
      <div className="scroller"><pre>{formattedJson}</pre></div>
    </div>
  );
}
