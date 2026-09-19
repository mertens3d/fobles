const fs = require("node:fs");
const path = require("node:path");

class StaticTestReporter {
  constructor(options = {}) {
    this.outputFile = path.resolve(
      options.outputFile ?? path.resolve(__dirname, "../../../tests/test-artifacts/reports/test-report.html"),
    );
    this.startedAt = new Date();
    this.results = [];
  }

  onTestEnd(test, result) {
    this.results.push({
      title: test.titlePath().join(" "),
      status: result.status,
      duration: result.duration,
      error: stripAnsi(result.error?.message ?? ""),
      steps: flattenSteps(result.steps ?? []),
    });
    this.writeReport({ status: "running" });
  }

  onEnd(fullResult) {
    this.writeReport(fullResult);
  }

  writeReport(fullResult) {
    const finishedAt = new Date();
    const timestamp = finishedAt.toLocaleString();
    const duration = finishedAt.getTime() - this.startedAt.getTime();
    const checks = this.results.flatMap((result) => result.steps);
    const counts = checks.reduce((summary, result) => {
      summary[result.status] = (summary[result.status] ?? 0) + 1;
      return summary;
    }, {});
    const passed = fullResult.status === "passed";
    const running = fullResult.status === "running";
    const reportStatus = running
      ? "Run in progress"
      : passed
        ? "All tests passed"
        : `Run ${formatStatus(fullResult.status).toLowerCase()}`;
    const rows = this.results
      .map((result) => {
        const testRow = `
        <tr class="test-row ${escapeHtml(result.status)}">
          <td><span class="badge badge-${escapeHtml(result.status)}">${escapeHtml(formatStatus(result.status))}</span></td>
          <td><strong>${escapeHtml(result.title)}</strong></td>
          <td>${escapeHtml(formatDuration(result.duration))}</td>
          <td>${renderTestDetails(result)}</td>
        </tr>`;
        const stepRows = result.steps
          .map(
            (step) => `
        <tr class="step-row ${escapeHtml(step.status)}">
          <td><span class="badge badge-${escapeHtml(step.status)}">${escapeHtml(formatStatus(step.status))}</span></td>
          <td class="step-title">${escapeHtml(step.title)}</td>
          <td>${escapeHtml(formatDuration(step.duration))}</td>
          <td>${renderDetails(step.error)}</td>
        </tr>`,
          )
          .join("");
        return testRow + stepRows;
      })
      .join("");

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playwright Test Report</title>
  <style>
    body { color: #1f2933; font: 16px system-ui, sans-serif; margin: 1rem 2rem; }
    h1 { margin-bottom: .25rem; }
    body { background: #f7f9fb; }
    main { width: 100%; }
    .status { color: ${running ? "#b26a00" : passed ? "#087f5b" : "#c92a2a"}; font-size: 1.2rem; font-weight: 700; }
    .meta { color: #52606d; }
    .summary { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1.5rem 0; }
    .summary-card { background: #fff; border: 1px solid #d9e2ec; border-radius: 6px; min-width: 120px; padding: .85rem 1rem; }
    .summary-card strong { display: block; font-size: 1.35rem; }
    table { background: #fff; border-collapse: collapse; margin-top: 1.5rem; width: 100%; }
    th, td { border: 1px solid #d9e2ec; padding: .6rem; text-align: left; vertical-align: top; }
    th { background: #f0f4f8; }
    tr.failed, tr.timedOut { background: #fff5f5; }
    tr.skipped { color: #52606d; }
    .step-row { background: #fbfcfe; }
    .step-title { padding-left: 2rem; white-space: pre-wrap; }
    .badge { border-radius: 999px; display: inline-block; font-size: .8rem; font-weight: 700; padding: .2rem .55rem; }
    .badge-passed { background: #d3f9d8; color: #087f5b; }
    .badge-failed, .badge-timedOut { background: #ffe3e3; color: #c92a2a; }
    .badge-skipped { background: #e9ecef; color: #52606d; }
    pre { margin: .75rem 0 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>Browser Test Report</h1>
    <p class="status">${reportStatus}</p>
    <p class="meta">${running ? "Updated" : "Completed"} ${escapeHtml(timestamp)} · Total duration ${escapeHtml(formatDuration(duration))}</p>
    <section class="summary">
      <div class="summary-card"><strong>${counts.passed ?? 0}</strong>Checks passed</div>
      <div class="summary-card"><strong>${counts.failed ?? 0}</strong>Checks failed</div>
      <div class="summary-card"><strong>${counts.skipped ?? 0}</strong>Checks skipped</div>
      <div class="summary-card"><strong>${checks.length}</strong>Checks total</div>
    </section>
    <table>
      <thead><tr><th>Result</th><th>Test step</th><th>Duration</th><th>Details</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>
`;

    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, html, "utf8");
    console.log(`Static test report written to ${this.outputFile}`);
  }
}

function formatStatus(status) {
  return status === "timedOut"
    ? "Timed out"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function flattenSteps(steps) {
  return steps.flatMap((step) => {
    const nested = flattenSteps(step.steps ?? []);
    if (step.category !== "test.step") return nested;
    return [
      {
        title: step.title,
        status: step.error ? "failed" : "passed",
        duration: step.duration ?? 0,
        error: stripAnsi(step.error?.message ?? ""),
      },
      ...nested,
    ];
  });
}

function renderDetails(error) {
  return error
    ? `<details><summary>View failure</summary><pre>${escapeHtml(error)}</pre></details>`
    : "-";
}

function renderTestDetails(result) {
  const details = [];
  if (result.status === "timedOut") {
    const lastStep = result.steps.at(-1)?.title;
    details.push(
      `Test timed out before the next step completed.${lastStep ? ` Last completed step: ${lastStep}.` : " No test step completed."}`,
    );
  }
  if (result.error) details.push(result.error);
  return details.length
    ? `<details open><summary>What happened</summary><pre>${escapeHtml(details.join("\n\n"))}</pre></details>`
    : "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripAnsi(value) {
  return String(value).replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    "",
  );
}

module.exports = StaticTestReporter;
