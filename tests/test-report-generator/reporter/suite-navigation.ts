import fs from "node:fs";
import path from "node:path";
import { escapeHtml } from "./report-utils";

export function renderSuiteNav(outputFile: string): string {
  const reportsDir = path.dirname(outputFile);
  const currentFile = path.basename(outputFile);
  let siblingFiles: string[];

  try {
    siblingFiles = fs
      .readdirSync(reportsDir)
      .filter((file) => file.startsWith("test-report") && file.endsWith(".html"))
      .sort();
  } catch {
    siblingFiles = [currentFile];
  }

  const links = siblingFiles
    .map((file) => {
      const label =
        file.replace(/^test-report-?/, "").replace(/\.html$/, "") || "current";
      return file === currentFile
        ? `<span class="current">${escapeHtml(label)}</span>`
        : `<a href="${escapeHtml(file)}">${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<nav class="suite-nav">${links}</nav>`;
}
