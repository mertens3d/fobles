// @source-path [fobles] src/shared/export/zip-export.ts

import { strToU8, zipSync } from "fflate";
import { downloadBlob } from "./download-export";
import { buildSanitizationReport, sanitizeExportText } from "./export-sanitizer";
import type { ExportSanitizationCounts } from "./export-sanitizer.types";

export type TextZipEntry = { readonly path: string; readonly content: string };

function addCounts(target: ExportSanitizationCounts, source: ExportSanitizationCounts): void {
  target.authorizationValues += source.authorizationValues;
  target.cookieValues += source.cookieValues;
  target.credentialFields += source.credentialFields;
  target.sensitiveQueryValues += source.sensitiveQueryValues;
  target.localWindowsPaths += source.localWindowsPaths;
}

export function downloadSanitizedTextZip(doc: Document, entries: readonly TextZipEntry[], fileName: string): void {
  const files: Record<string, Uint8Array> = {};
  const counts: ExportSanitizationCounts = { authorizationValues: 0, cookieValues: 0, credentialFields: 0, sensitiveQueryValues: 0, localWindowsPaths: 0 };

  entries.forEach((entry) => {
    const sanitized = sanitizeExportText(entry.content);
    addCounts(counts, sanitized.counts);
    files[entry.path] = strToU8(sanitized.value);
  });

  files["sanitization-report.txt"] = strToU8(buildSanitizationReport(counts));
  const zipped = zipSync(files, { level: 6 });
  downloadBlob(doc, new Blob([zipped], { type: "application/zip" }), fileName);
}
