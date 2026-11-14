// @source-path [fobles] src/shared/export/text-export.ts

import { downloadBlob } from "./download-export.ts";
import { sanitizeExportText } from "./export-sanitizer.ts";
import { UTF8_BOM } from "./export.const.ts";

export async function copySanitizedText(value: string): Promise<void> {
  const sanitized = sanitizeExportText(value);
  await navigator.clipboard.writeText(sanitized.value);
}

export function downloadSanitizedText(
  doc: Document,
  value: string,
  fileName: string,
  mimeType = "text/plain;charset=utf-8",
  bom = false,
): void {
  const sanitized = sanitizeExportText(value);
  downloadBlob(doc, new Blob([bom ? UTF8_BOM + sanitized.value : sanitized.value], { type: mimeType }), fileName);
}
