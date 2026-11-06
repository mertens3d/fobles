import fs from "node:fs";
import path from "node:path";

export function renderSuiteNav(): string {
  return '<nav class="suite-nav" data-suite-nav aria-label="Test reports"></nav>';
}

export function writeSuiteNavigationData(reportsDirectory: string, reportFiles: Iterable<string>): void {
  const uniqueFiles = [...new Set(reportFiles)].sort();
  const data = `globalThis.FOBLES_TEST_REPORTS = ${JSON.stringify(uniqueFiles).replace(/</g, "\\u003c")};\n`;
  fs.mkdirSync(reportsDirectory, { recursive: true });
  fs.writeFileSync(path.join(reportsDirectory, "suite-navigation-data.js"), data, "utf8");
}
