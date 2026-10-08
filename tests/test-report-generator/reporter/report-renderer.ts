import type { CurrentFullResult, ReportResult, ReportStep, ScreenshotInfo } from "./reporter-types";
import { escapeHtml, formatDuration, formatStatus, toDisplayUrl } from "./report-utils";
import { renderNotes, renderScreenshotLinks } from "./screenshot-rendering";
import { renderSuiteNav } from "./suite-navigation";
import { refreshScriptRunning } from "./client-script";

export type RenderReportInput = {
  outputFile: string;
  fullResult: CurrentFullResult;
  results: ReportResult[];
  startedAt: Date;
  totalTests: number;
  loginAlertUrl: string | null;
};

function renderDetails(error: string, screenshots: ScreenshotInfo[] = []): string {
  const parts: string[] = [];
  if (error) {
    parts.push(`<details><summary>View failure</summary><pre>${escapeHtml(error)}</pre></details>`);
  }
  const screenshotLinks = renderScreenshotLinks(screenshots);
  if (screenshotLinks) parts.push(screenshotLinks);
  return parts.length ? parts.join("") : "-";
}

function renderStepTitle(step: ReportStep): string {
  const { title, notes } = step;
  const separatorIndex = title.indexOf(": ");
  const notesHtml = renderNotes(notes);
  if (separatorIndex === -1) return escapeHtml(title) + notesHtml;

  const prefix = title.slice(0, separatorIndex);
  const afterPrefix = title.slice(separatorIndex + 2);
  const expectsSeparatorIndex = afterPrefix.indexOf(": ");

  if (expectsSeparatorIndex === -1) {
    return `<strong>${escapeHtml(prefix)}:</strong> ${escapeHtml(afterPrefix)}${notesHtml}`;
  }

  const action = afterPrefix.slice(0, expectsSeparatorIndex);
  const expectation = afterPrefix.slice(expectsSeparatorIndex + 2);
  return `<strong>${escapeHtml(prefix)}:</strong> ${escapeHtml(action)}<span class="step-expects">expects: ${escapeHtml(expectation)}</span>${notesHtml}`;
}

function renderTestTitle(result: ReportResult): string {
  const [, project, file, ...rest] = result.titlePath;
  const notesHtml = renderNotes(result.notes);
  return `<strong>${escapeHtml(`${project ?? ""} ${file ?? ""}`.trim())}</strong><span class="step-expects">${escapeHtml(rest.join(" "))}</span>${notesHtml}`;
}

function renderTestDetails(result: ReportResult): string {
  const details: string[] = [];

  if (result.status === "timedOut") {
    const lastStep = result.steps[result.steps.length - 1]?.title;
    details.push(
      `Test timed out before the next step completed.${lastStep ? ` Last completed step: ${lastStep}.` : " No test step completed."}`,
    );
  }

  if (result.error) details.push(result.error);

  const parts: string[] = [];
  if (details.length) {
    parts.push(
      `<details><summary>What happened</summary><pre>${escapeHtml(details.join("\n\n"))}</pre></details>`,
    );
  }

  const screenshotLinks = renderScreenshotLinks(result.screenshots);
  if (screenshotLinks) parts.push(screenshotLinks);
  return parts.length ? parts.join("") : "-";
}

export function renderReport(input: RenderReportInput): string {
  const finishedAt = new Date();
  const timestamp = finishedAt.toLocaleString();
  const duration = finishedAt.getTime() - input.startedAt.getTime();
  const checks = input.results.flatMap((result) => result.steps);
  const counts = checks.reduce<Record<string, number>>((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, {});
  const passed = input.fullResult.status === "passed";
  const running = input.fullResult.status === "running";
  const failedCount = counts.failed ?? 0;

  const rows = input.results
    .map((result) => {
      const testRow = `
        <tr class="test-row ${escapeHtml(result.status)}">
          <td class="test-step-col"><span class="row-kind row-kind-test">Test</span><span class="test-index">${result.index}:${input.totalTests}</span> - ${renderTestTitle(result)}</td>
          <td class="result-col"><span class="badge badge-${escapeHtml(result.status)}">${escapeHtml(formatStatus(result.status))}</span><span class="duration">${escapeHtml(formatDuration(result.duration))}</span></td>
          <td class="details-col">${renderTestDetails(result)}</td>
        </tr>`;

      const stepRows = result.steps
        .map(
          (step) => `
        <tr class="step-row ${escapeHtml(step.status)}">
          <td class="step-title test-step-col"><span class="row-kind row-kind-step">Step</span>${renderStepTitle(step)}</td>
          <td class="result-col"><span class="badge badge-${escapeHtml(step.status)}">${escapeHtml(formatStatus(step.status))}</span><span class="duration">${escapeHtml(formatDuration(step.duration))}</span></td>
          <td class="details-col">${renderDetails(step.error, step.screenshots)}</td>
        </tr>`,
        )
        .join("");

      return testRow + stepRows;
    })
    .join("");

  const suiteNavHtml = renderSuiteNav(input.outputFile);
  const loginAlertHtml = input.loginAlertUrl
    ? `<div class="login-alert">Login needed - switch to the browser window and log in, then click "Resume" in the Playwright Inspector. (<a href="${escapeHtml(input.loginAlertUrl)}" target="_blank">${escapeHtml(toDisplayUrl(input.loginAlertUrl))}</a>)</div>`
    : "";
  const statusText = !running && !passed
    ? ` · ${escapeHtml(formatStatus(input.fullResult.status))}`
    : "";
  const runningText = running ? "Run in progress · " : "";
  const refreshText = running
  ? ` ·
      <label>
        <input
          type="checkbox"
          id="auto-refresh-enabled"
          checked
        />
        auto refresh
      </label>
      · <span id="refresh-countdown"></span>`
  : "";
  const refreshScript = running ? `${refreshScriptRunning}` : "";

  const head = `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playwright Test Report</title>
  <link rel="stylesheet" href="assets/report.css"></link>
  </head>`;

  return `<!doctype html>
  <html lang="en">
  ${head}
  <body>
  <main>
    ${suiteNavHtml}
    ${loginAlertHtml}
    <header class="report-header">
      <h1>Browser Test Report</h1>
      <span class="meta-inline">${runningText}${escapeHtml(timestamp)} · ${escapeHtml(formatDuration(duration))}${statusText}${refreshText}</span>
      
    </header>
    <section class="summary">
      <div class="summary-card${failedCount === 0 && (counts.passed ?? 0) > 0 ? " success" : ""}"><strong>${counts.passed ?? 0}</strong>Checks passed</div>
      <div class="summary-card${failedCount > 0 ? " alert" : ""}"><strong>${failedCount}</strong>Checks failed</div>
      <div class="summary-card"><strong>${counts.skipped ?? 0}</strong>Checks skipped</div>
      <div class="summary-card"><strong>${checks.length}</strong>Checks total</div>
    </section>
    <div class="table-container">
    <table>
    <thead><tr><th class="test-step-col">Test step</th><th class="result-col">Result</th><th class="details-col">Details</th></tr></thead>
    <tbody>${rows}</tbody>
    </table>
    </div>
  </main>
  <div class="screenshot-modal-backdrop" id="screenshot-modal-backdrop">
    <button type="button" class="screenshot-modal-close" id="screenshot-modal-close" aria-label="Close">&times;</button>
    <img id="screenshot-modal-img" alt="">
  </div>
  <script src="assets/scripts.js"></script>
</body>
</html>`;
}
