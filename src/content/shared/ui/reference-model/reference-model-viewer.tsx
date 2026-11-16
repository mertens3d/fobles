// @source-path [fobles] src/content/shared/ui/reference-model/reference-model-viewer.tsx

import { downloadSanitizedText } from "../../../../shared/export/text-export";
import { sanitizeExportText } from "../../../../shared/export/export-sanitizer";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/model.types";
import { DetailsPanel } from "../details/details-panel";
import { DETAILS_PANEL } from "../details/details-panel.const";
import { AUDITOR_EXPORT_CSV_EVENT, REFERENCE_MODEL_VIEWER } from "./reference-model.const";

export type ReferenceModelViewerProps = { referenceModel: ReferenceModelNode };

function rootLabel(referenceModel: ReferenceModelNode): string | undefined {
  return referenceModel.nodeType === "item"
    ? (referenceModel.scItem.scItemName ?? referenceModel.scItem.scItemId)
    : referenceModel.name;
}

// Agent: The hosting FoblesDetailsWindow owns the only visible title, so the root item name goes there.
export function referenceModelWindowTitle(referenceModel: ReferenceModelNode): string {
  const label = rootLabel(referenceModel);
  return label ? `${REFERENCE_MODEL_VIEWER.TITLE}: ${label}` : REFERENCE_MODEL_VIEWER.TITLE;
}

function downloadFileName(): string {
  return `${REFERENCE_MODEL_VIEWER.FILE_PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
}

// Agent: Content only. Callers host this inside FoblesDetailsWindow, which owns the title bar, close control,
// Agent: placement and clickaway; DetailsPanel owns the action row and the shared CopyButton.
export function ReferenceModelViewer({ referenceModel }: ReferenceModelViewerProps) {
  const formattedJson = JSON.stringify(referenceModel, null, 2);

  function handleDownload(): void {
    downloadSanitizedText(document, formattedJson, downloadFileName(), REFERENCE_MODEL_VIEWER.JSON_MIME_TYPE);
  }

  function handleExportCsv(): void {
    window.dispatchEvent(new Event(AUDITOR_EXPORT_CSV_EVENT));
  }

  return (
    <DetailsPanel
      getCopyText={() => sanitizeExportText(formattedJson).value}
      actions={
        <>
          <button type="button" className={DETAILS_PANEL.CLASS.BUTTON} onClick={handleDownload}>
            {REFERENCE_MODEL_VIEWER.TEXT.DOWNLOAD_JSON}
          </button>
          <button type="button" className={DETAILS_PANEL.CLASS.BUTTON} onClick={handleExportCsv}>
            {REFERENCE_MODEL_VIEWER.TEXT.EXPORT_CSV}
          </button>
        </>
      }
    >
      <pre className={REFERENCE_MODEL_VIEWER.CLASS.JSON}>{formattedJson}</pre>
    </DetailsPanel>
  );
}
