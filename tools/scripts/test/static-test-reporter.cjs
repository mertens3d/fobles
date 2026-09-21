const fs = require("node:fs");
const path = require("node:path");
const { exec } = require("node:child_process");

class StaticTestReporter {
  constructor(options = {}) {
    this.outputFile = path.resolve(
      options.outputFile ?? path.resolve(__dirname, "../../../tests/test-artifacts/reports/test-report.html"),
    );
    this.startedAt = new Date();
    this.results = [];
    this.loginAlertUrl = null;
    this.lastFullResult = { status: "running" };
    this.totalTests = 0;
  }

  onBegin(config, suite) {
    this.totalTests = suite.allTests().length;
    printStopSafelyWarning();
    this.writeReport({ status: "running" });
    openInBrowser(this.outputFile);
  }

  onStdOut(chunk) {
    const text = chunk.toString();
    const loginMatch = text.match(/LOGIN NEEDED at (\S+)/);
    if (loginMatch) {
      this.loginAlertUrl = loginMatch[1];
      this.writeReport(this.lastFullResult);
    } else if (this.loginAlertUrl && text.includes("[sitecore preflight] Looking for Fobles menu")) {
      this.loginAlertUrl = null;
      this.writeReport(this.lastFullResult);
    }
  }

  onTestEnd(test, result) {
    const screenshots = (result.attachments ?? [])
      .filter((attachment) => attachment.path && attachment.contentType?.startsWith("image/"))
      .map((attachment) => ({
        name: attachment.name,
        href: toReportRelativeHref(attachment.path, this.outputFile),
      }));
    const notes = (result.attachments ?? [])
      .filter((attachment) => attachment.contentType === "text/plain" && attachment.body)
      .map((attachment) => ({
        name: attachment.name,
        text: attachment.body.toString("utf8"),
      }));
    const steps = flattenSteps(result.steps ?? []);
    const remainingScreenshots = matchAttachmentsToSteps(screenshots, steps, "screenshots");
    const remainingNotes = matchAttachmentsToSteps(notes, steps, "notes");

    this.results.push({
      index: this.results.length + 1,
      titlePath: test.titlePath(),
      status: result.status,
      duration: result.duration,
      error: stripAnsi(result.error?.message ?? ""),
      steps,
      screenshots: remainingScreenshots,
      notes: remainingNotes,
    });
    this.writeReport({ status: "running" });
  }

  onEnd(fullResult) {
    this.writeReport(fullResult);
  }

  writeReport(fullResult) {
    this.lastFullResult = fullResult;
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
    const failedCount = counts.failed ?? 0;
    const rows = [...this.results]
      .map((result) => {
        const testRow = `
        <tr class="test-row ${escapeHtml(result.status)}">
          <td class="test-step-col"><span class="row-kind row-kind-test">Test</span><span class="test-index">${result.index}:${this.totalTests}</span> - ${renderTestTitle(result)}</td>
          <td class="result-col"><span class="badge badge-${escapeHtml(result.status)}">${escapeHtml(formatStatus(result.status))}</span><span class="duration">${escapeHtml(formatDuration(result.duration))}</span></td>
          <td class="details-col">${renderTestDetails(result)}</td>
        </tr>`;
        const stepRows = result.steps
          .map(
            (step) => `
        <tr class="step-row ${escapeHtml(step.status)}">
          <td class="step-title test-step-col"><span class="row-kind row-kind-step">Step</span>${renderStepTitle(step.title, step.notes)}</td>
          <td class="result-col"><span class="badge badge-${escapeHtml(step.status)}">${escapeHtml(formatStatus(step.status))}</span><span class="duration">${escapeHtml(formatDuration(step.duration))}</span></td>
          <td class="details-col">${renderDetails(step.error, step.screenshots)}</td>
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
    body { color: #1f2933; font: 16px system-ui, sans-serif; margin: .5rem 1.5rem; background: #f7f9fb; }
    main { width: 100%; }
    header.report-header { align-items: baseline; display: flex; flex-wrap: wrap; gap: .6rem; }
    h1 { font-size: 1.05rem; margin: 0; }
    .meta-inline { color: ${running ? "#b26a00" : "#52606d"}; font-size: .85rem; }
    .summary { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0; }
    .summary-card { background: #fff; border: 1px solid #d9e2ec; border-radius: 6px; min-width: 90px; padding: .4rem .7rem; }
    .summary-card strong { display: block; font-size: 1.1rem; }
    .summary-card.alert { background: #ffe3e3; border-color: #ffa8a8; color: #c92a2a; }
    .summary-card.success { background: #d3f9d8; border-color: #8ce99a; color: #087f5b; }
    table { background: #fff; border-collapse: collapse; margin-top: .5rem; table-layout: fixed; width: 100%; }
    th, td { border: 1px solid #d9e2ec; padding: .6rem; text-align: left; vertical-align: top; }
    th { background: #f0f4f8; }
    .test-step-col { overflow-wrap: break-word; width: 400px; }
    .result-col { width: 90px; }
    .details-col { width: 500px; }
    tr.failed, tr.timedOut { background: #fff5f5; }
    tr.skipped { color: #52606d; }
    .test-row { background: #eef3f8; }
    .step-row { background: #fbfcfe; }
    .step-title { padding-left: 2rem; white-space: pre-wrap; }
    .step-expects { color: #37424c; display: block; font-size: .9rem; padding-left: 1.2rem; }
    .actual-note { color: #37424c; font-size: .9rem; margin-bottom: .4rem; padding-left: 1.2rem; }
    .test-index { color: #52606d; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .duration { color: #52606d; display: block; font-size: .8rem; margin-top: .2rem; white-space: nowrap; }
    .row-kind { border-radius: 4px; display: inline-block; font-size: .68rem; font-weight: 700; letter-spacing: .04em; margin-right: .5rem; padding: .1rem .4rem; text-transform: uppercase; vertical-align: middle; }
    .row-kind-test { background: #d0ebff; color: #1864ab; }
    .row-kind-step { background: #e5dbff; color: #5f3dc4; }
    .screenshot-links { line-height: 1.7; }
    .screenshot-link { color: inherit; display: inline-block; text-decoration: none; vertical-align: top; }
    .screenshot-thumb { background: #fff; border: 1px solid #d9e2ec; border-radius: 4px; display: block; max-height: 320px; max-width: 480px; object-fit: contain; }
    .badge { border-radius: 999px; display: inline-block; font-size: .8rem; font-weight: 700; padding: .2rem .55rem; }
    .badge-passed { background: #d3f9d8; color: #087f5b; }
    .badge-failed, .badge-timedOut { background: #ffe3e3; color: #c92a2a; }
    .badge-skipped { background: #e9ecef; color: #52606d; }
    pre { margin: .75rem 0 0; white-space: pre-wrap; }
    .login-alert { background: #fab005; border-radius: 6px; color: #1f2933; font-weight: 700; margin-bottom: .5rem; padding: .6rem 1rem; position: sticky; top: 0; z-index: 1; }
    .login-alert a { color: #1f2933; }
  </style>
</head>
<body>
  <main>
    ${this.loginAlertUrl ? `<div class="login-alert">Login needed - switch to the browser window and log in, then click "Resume" in the Playwright Inspector. (<a href="${escapeHtml(this.loginAlertUrl)}" target="_blank">${escapeHtml(toDisplayUrl(this.loginAlertUrl))}</a>)</div>` : ""}
    <header class="report-header">
      <h1>Browser Test Report</h1>
      <span class="meta-inline">${running ? "Run in progress · " : ""}${escapeHtml(timestamp)} · ${escapeHtml(formatDuration(duration))}${!running && !passed ? ` · ${escapeHtml(formatStatus(fullResult.status))}` : ""}${running ? ` · <span id="refresh-countdown"></span>` : ""}</span>
    </header>
    <section class="summary">
      <div class="summary-card${failedCount === 0 && (counts.passed ?? 0) > 0 ? " success" : ""}"><strong>${counts.passed ?? 0}</strong>Checks passed</div>
      <div class="summary-card${failedCount > 0 ? " alert" : ""}"><strong>${failedCount}</strong>Checks failed</div>
      <div class="summary-card"><strong>${counts.skipped ?? 0}</strong>Checks skipped</div>
      <div class="summary-card"><strong>${checks.length}</strong>Checks total</div>
    </section>
    <table>
      <thead><tr><th class="test-step-col">Test step</th><th class="result-col">Result</th><th class="details-col">Details</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
  ${
    running
      ? `<script>
  (function () {
    var secondsLeft = 2;
    var el = document.getElementById("refresh-countdown");
    function tick() {
      if (el) el.textContent = "refreshing in " + secondsLeft + "s";
      if (secondsLeft <= 0) { location.reload(); return; }
      secondsLeft -= 1;
      setTimeout(tick, 1000);
    }
    tick();
  })();
</script>`
      : ""
  }
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

// Raw attachment names are sanitized filenames (e.g. "item-path-sitecore-layout-Renderings.png",
// "step-Click-sitecore-layout-Renderings-png-<hash>.png") - not great as link text. Show a short
// human label instead, keeping the raw name as smaller gray detail alongside it.
function aliasScreenshotName(name) {
  const lower = name.toLowerCase();
  if (lower.startsWith("data-section-")) return "Data section";
  if (lower.startsWith("item-path-")) return "Item path";
  if (lower.startsWith("step-")) return "Step screenshot";
  if (lower === "screenshot" || lower.startsWith("screenshot")) return "Full page";
  return "Screenshot";
}

function renderScreenshotLinks(screenshots) {
  if (!screenshots?.length) return "";
  const links = screenshots
    .map(
      (shot) => `
      <a href="${escapeHtml(shot.href)}" target="_blank" class="screenshot-link" title="${escapeHtml(shot.name)}">
        <img src="${escapeHtml(shot.href)}" alt="${escapeHtml(aliasScreenshotName(shot.name))}" class="screenshot-thumb" loading="lazy">
      </a>`,
    )
    .join("<br>");
  return `<div class="screenshot-links">${links}</div>`;
}

function renderNotes(notes) {
  if (!notes?.length) return "";
  const lines = notes.map((note) => `<div class="actual-note">${escapeHtml(note.text)}</div>`).join("");
  return lines;
}

function renderDetails(error, screenshots) {
  const parts = [];
  if (error) parts.push(`<details><summary>View failure</summary><pre>${escapeHtml(error)}</pre></details>`);
  const screenshotLinks = renderScreenshotLinks(screenshots);
  if (screenshotLinks) parts.push(screenshotLinks);
  return parts.length ? parts.join("") : "-";
}

// createStep (tests/e2e/fobles-helpers.ts) joins its titlePrefix onto the step title as
// "prefix: title" - bold just that leading "prefix:" so the strategy name stands out from the
// step's own wording. If the remaining title itself has a further "action: expectation" colon
// (e.g. "Toggle Fobles off: the field returns to its original shape"), break the expectation onto
// its own indented "expects:" line for scannability. "actual: ..." notes (fobles-helpers.ts'
// expectFoblesButtonSameTabNavigation/NewTabNavigation) render the same way, right underneath.
function renderStepTitle(title, notes) {
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

// test.titlePath() is ["", project, file, ...describe blocks, test name] for every spec in this
// repo (a leading empty root-suite title, then one describe wrapping one test) - drop that leading
// "" and break the rest onto two lines: project+file, then the rest, since the flat space-joined
// string was unreadably long on one line.
function renderTestTitle(result) {
  const [, project, file, ...rest] = result.titlePath;
  const notesHtml = renderNotes(result.notes);
  return `<strong>${escapeHtml(`${project} ${file}`)}</strong><span class="step-expects">${escapeHtml(rest.join(" "))}</span>${notesHtml}`;
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
  const parts = [];
  if (details.length) {
    parts.push(
      `<details><summary>What happened</summary><pre>${escapeHtml(details.join("\n\n"))}</pre></details>`,
    );
  }
  const screenshotLinks = renderScreenshotLinks(result.screenshots);
  if (screenshotLinks) parts.push(screenshotLinks);
  return parts.length ? parts.join("") : "-";
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

function openInBrowser(filePath) {
  const url = `file://${filePath.replace(/\\/g, "/")}`;
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, (error) => {
    if (error) console.warn(`Could not auto-open test report: ${error.message}`);
  });
}

function printStopSafelyWarning() {
  const banner = "=".repeat(70);
  // Amber background, black text - matches the login-needed banner in fixtures/sitecore.ts.
  const ansiAmber = "\x1b[43m\x1b[30m";
  const ansiReset = "\x1b[0m";
  console.log(
    `\n${ansiAmber}${banner}${ansiReset}\n${ansiAmber}Stopping this run mid-test leaves the Sitecore session logged in and its${ansiReset}\n${ansiAmber}active-user slot occupied. To stop cleanly, press Ctrl+C ONCE and let it${ansiReset}\n${ansiAmber}finish tearing down (that's what logs the session out) - don't press Ctrl+C${ansiReset}\n${ansiAmber}again or close the terminal, or the session will stay logged in.${ansiReset}\n${ansiAmber}${banner}${ansiReset}\n`,
  );
}

function toReportRelativeHref(attachmentPath, reportFile) {
  const relative = path.relative(path.dirname(reportFile), attachmentPath);
  return relative.replace(/\\/g, "/");
}

function toDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

// Sanitized the same way test code sanitizes names into screenshot filenames, so the two can be
// matched up without the reporter needing to know anything about how tests name their files.
function sanitizeForMatch(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// A step can be identified by its full title (the default `createStep` screenshot naming) or by
// a quoted path/label within it (e.g. `Click "/sitecore/media library"`, used by more specific
// screenshots like the item-path ones) - check both. Both keys are truncated to match
// createStep's MAX_STEP_SCREENSHOT_NAME_LENGTH (tests/e2e/fobles-helpers.ts) - screenshot
// filenames are capped there to avoid exceeding Windows' MAX_PATH, so a full-length key would
// never be found inside the (shorter) filename.
const STEP_SCREENSHOT_NAME_MATCH_LENGTH = 40;

function extractStepMatchKeys(title) {
  const keys = [sanitizeForMatch(title).slice(0, STEP_SCREENSHOT_NAME_MATCH_LENGTH)];
  const quoted = title.match(/"([^"]+)"/);
  if (quoted) keys.push(sanitizeForMatch(quoted[1]).slice(0, STEP_SCREENSHOT_NAME_MATCH_LENGTH));
  return keys.filter(Boolean);
}

// Assigns each attachment (screenshot or text note) to whichever step(s) it matches, mutating
// `steps[field]` in place, and returns whichever attachments matched no step - those stay on the
// test row as a fallback (e.g. the automatic whole-test "screenshot" attachment). Every attachment
// name places its match key immediately before its own extension (step-<key>.png,
// item-path-<key>.png, actual-fo-<key>.txt) - requiring that exact suffix, not just "contains",
// matters because one step's quoted value can be a path-prefix of another's (e.g.
// "/sitecore/media library" vs "/sitecore/media library/Project") - a loose substring check let
// the shorter step steal the longer step's attachment too.
function matchAttachmentsToSteps(items, steps, field) {
  const remaining = [...items];
  for (const step of steps) {
    const keys = extractStepMatchKeys(step.title);
    const matched = [];
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const itemKey = remaining[i].name.toLowerCase();
      const extension = itemKey.slice(itemKey.lastIndexOf("."));
      if (!keys.some((key) => itemKey.endsWith(`${key}${extension}`))) continue;
      matched.unshift(remaining[i]);
      remaining.splice(i, 1);
    }
    if (matched.length) step[field] = matched;
  }
  return remaining;
}

module.exports = StaticTestReporter;
