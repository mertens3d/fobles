import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import { matchAttachmentsToSteps } from "./reporter/attachment-matching";
import { printStopSafelyWarning } from "./reporter/browser-utils";
import { renderReport } from "./reporter/report-renderer";
import { getReportGroup, reportGroupName } from "./reporter/report-group";
import { writeSuiteNavigationData } from "./reporter/suite-navigation";
import type {
  CurrentFullResult,
  NoteInfo,
  ReporterOptions,
  ReportStep,
  ScreenshotInfo,
  ReportResult,
} from "./reporter/reporter.types";
import { stripAnsiSafe, toReportRelativeHref } from "./reporter/report-utils";

function flattenSteps(steps: TestResult["steps"]): ReportStep[] {
  return steps.flatMap((step) => {
    const nested = flattenSteps(step.steps ?? []);
    if (step.category !== "test.step") {
      return nested;
    }

    return [
      {
        title: step.title,
        status: step.error ? "failed" : "passed",
        duration: step.duration ?? 0,
        error: stripAnsiSafe(step.error?.message ?? ""),
      },
      ...nested,
    ];
  });
}

export default class StaticTestReporter implements Reporter {
  private readonly outputFile: string;
  private readonly startedAt: Date;
  private readonly resultsByFolder: Map<string, ReportResult[]>;
  // private readonly css: string;
  private loginAlertUrl: string | null;
  private lastFullResult: CurrentFullResult;
  private totalTests: number;
  private readonly runtimeOutput = new WeakMap<TestResult, string[]>();
  private readonly reportFiles = new Set<string>();

  constructor(options: ReporterOptions = {}) {
    this.outputFile = path.resolve(
      options.outputFile ?? path.resolve(process.cwd(), "playwright", "test-artifacts", "reports", "test-report.html"),
    );
    this.startedAt = new Date();
    this.resultsByFolder = new Map();
    this.loginAlertUrl = null;
    this.lastFullResult = { status: "running" };
    this.totalTests = 0;

    // const cssPath = fileURLToPath(new URL("./reporter/report.css", import.meta.url));
    // this.css = fs.readFileSync(cssPath, "utf8");
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.totalTests = suite.allTests().length;
    this.loadExistingReportFiles();
    this.reportFiles.add(path.basename(this.outputFile));
    this.writeSuiteNavigationData();
    printStopSafelyWarning();
    this.writeReport({ status: "running" });
  }

  onStdOut(chunk: string | Buffer, _test?: TestCase, result?: TestResult): void {
    this.captureRuntimeOutput(chunk, result);
    const text = chunk.toString();
    const loginMatch = text.match(/LOGIN NEEDED at (\S+)/);

    if (loginMatch) {
      this.loginAlertUrl = loginMatch[1];
      this.writeReport(this.lastFullResult);
    } else if (this.loginAlertUrl && text.includes("[sitecore preflight] Looking for Fobles flyout")) {
      this.loginAlertUrl = null;
      this.writeReport(this.lastFullResult);
    }
  }

  onStdErr(chunk: string | Buffer, _test?: TestCase, result?: TestResult): void {
    this.captureRuntimeOutput(chunk, result);
  }

  private captureRuntimeOutput(chunk: string | Buffer, result?: TestResult): void {
    if (!result) {
      return;
    }

    const chunks = this.runtimeOutput.get(result) ?? [];
    chunks.push(chunk.toString());
    this.runtimeOutput.set(result, chunks);
  }

  private saveRuntimeLog(test: TestCase, result: TestResult): { name: string; href: string } {
    const chunks = this.runtimeOutput.get(result);
    const output = chunks?.join("") ?? [
      "[stdout]\n" + result.stdout.map(String).join(""),
      "[stderr]\n" + result.stderr.map(String).join(""),
    ].join("\n");
    const errors = result.errors.map((error, index) => {
      const message = error.message ?? error.value ?? "Unknown error";
      const stack = error.stack ?? "";
      const detail = stack.includes(message) ? stack : [message, stack].filter(Boolean).join("\n");
      return `Error ${index + 1}:\n${detail}`;
    }).join("\n\n");
    const logDir = path.join(path.dirname(this.outputFile), "runtime-logs");
    const logPath = path.join(logDir, `${randomUUID()}.log`);
    const contents = [
      test.titlePath().join(" > "),
      `Status: ${result.status}`,
      `Worker: ${result.parallelIndex + 1}; attempt: ${result.retry + 1}`,
      `Duration: ${result.duration} ms`,
      "",
      "=== Test runtime output (stdout/stderr) ===",
      output || "(No test runtime output)",
      "",
      "=== Test errors ===",
      errors || "(No test errors)",
    ].join("\n");

    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(logPath, stripAnsiSafe(contents), "utf8");
    this.runtimeOutput.delete(result);
    return { name: "Test runtime log", href: toReportRelativeHref(logPath, this.outputFile) };
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    console.log("TEST ENDED");
    console.log(test.location.file);
    console.log(getFolderName(test));

    const screenshots: ScreenshotInfo[] = (result.attachments ?? [])
      .filter((attachment) => attachment.path && attachment.contentType?.startsWith("image/"))
      .map((attachment) => ({ name: attachment.name, href: toReportRelativeHref(attachment.path!, this.outputFile) }));

    const notes: NoteInfo[] = (result.attachments ?? [])
      .filter((attachment) => attachment.contentType === "text/plain" && attachment.body)
      .map((attachment) => ({ name: attachment.name, text: attachment.body!.toString("utf8") }));

    const foblesLogAttachment = (result.attachments ?? []).find(
      (attachment) => attachment.contentType === "text/x-fobles-log" && attachment.path,
    );

    const foblesLog = foblesLogAttachment?.path
      ? { name: foblesLogAttachment.name, href: toReportRelativeHref(foblesLogAttachment.path, this.outputFile) }
      : undefined;

    console.log("**** Test Ended: ");

    for (const step of result.steps ?? []) {
      console.log(`step: ${step.title}`);

      for (const attachment of step.attachments ?? []) {
        console.log(`\t attachment: ${attachment.name} - ${attachment.path}`);
      }
    }

    if (foblesLog) {
      console.log(`[reporter] Fobles log: ${foblesLog.href}`);
    }

    const steps = flattenSteps(result.steps ?? []);

    const remainingScreenshots = matchAttachmentsToSteps(screenshots, steps, "screenshots");

    const remainingNotes = matchAttachmentsToSteps(notes, steps, "notes");

    const folderName = getFolderName(test);
    const folderOutputFile = `test-report-${folderName}.html`;
    this.reportFiles.add(folderOutputFile);
    this.writeSuiteNavigationData();

    if (!this.resultsByFolder.has(folderName)) {
      this.resultsByFolder.set(folderName, []);
    }

    const folderResults = this.resultsByFolder.get(folderName)!;

    const reportResult: ReportResult = {
      index: folderResults.length + 1,
      titlePath: test.titlePath(),
      status: result.status,
      duration: result.duration,
      error: stripAnsiSafe(result.errors.map((error) => error.stack ?? error.message ?? error.value ?? "").join("\n\n")),
      steps,
      screenshots: remainingScreenshots,
      notes: remainingNotes,
      foblesLog,
      runtimeLog: this.saveRuntimeLog(test, result),
    };

    folderResults.push(reportResult);

    this.writeReport({ status: "running" });
  }

  onEnd(fullResult: FullResult): void {
    this.writeReport(fullResult);
    this.loadExistingReportFiles();
    this.writeSuiteNavigationData();
  }

  private loadExistingReportFiles(): void {
    const reportsDirectory = path.dirname(this.outputFile);
    try {
      for (const file of fs.readdirSync(reportsDirectory)) {
        if (file.startsWith("test-report") && file.endsWith(".html")) {
          this.reportFiles.add(file);
          this.upgradeReportNavigation(path.join(reportsDirectory, file));
        }
      }
    } catch {
      fs.mkdirSync(reportsDirectory, { recursive: true });
    }
  }

  private upgradeReportNavigation(reportPath: string): void {
    let html = fs.readFileSync(reportPath, "utf8");
    const hasSharedNavigation = html.includes("data-suite-nav") && html.includes("assets/suite-navigation.js");
    if (hasSharedNavigation) {
      return;
    }

    html = html.replace(/<nav class="suite-nav">[\s\S]*?<\/nav>/, '<nav class="suite-nav" data-suite-nav aria-label="Test reports"></nav>');
    if (!html.includes("assets/suite-navigation.js")) {
      html = html.replace(
        '<script src="assets/scripts.js"></script>',
        '<script src="suite-navigation-data.js"></script>\n  <script src="assets/suite-navigation.js"></script>\n  <script src="assets/scripts.js"></script>',
      );
    }
    fs.writeFileSync(reportPath, html, "utf8");
  }

  private writeSuiteNavigationData(): void {
    writeSuiteNavigationData(path.dirname(this.outputFile), this.reportFiles);
  }

  private writeReport(fullResult: CurrentFullResult): void {
    this.lastFullResult = fullResult;

    const allResults = Array.from(this.resultsByFolder.values()).flat();

    console.log("-----------------Current results by folder:------------");
    console.log([...this.resultsByFolder.keys()]);

    const liveHtml = renderReport({
      outputFile: this.outputFile,
      isCurrentReport: true,
      fullResult,
      results: allResults,
      startedAt: this.startedAt,
      totalTests: this.totalTests,
      loginAlertUrl: this.loginAlertUrl,
    });

    copyAssets(this.outputFile);

    fs.writeFileSync(this.outputFile, liveHtml, "utf8");

    for (const [folderName, results] of this.resultsByFolder) {
      const folderOutputFile = path.join(path.dirname(this.outputFile), `test-report-${folderName}.html`);

      const html = renderReport({
        outputFile: folderOutputFile,
        isCurrentReport: path.resolve(folderOutputFile) === this.outputFile,
        fullResult,
        results,
        startedAt: this.startedAt,
        totalTests: results.length,
        loginAlertUrl: this.loginAlertUrl,
      });
      fs.mkdirSync(path.dirname(folderOutputFile), { recursive: true });
      fs.writeFileSync(folderOutputFile, html, "utf8");
    }
    console.log("WRITE REPORT V4");
    console.log(`Static test report written to ${this.outputFile}`);
  }
}

function getFolderName(test: TestCase): string {
  const reportGroup = getReportGroup(test.location.file);

  return reportGroup ? reportGroupName(reportGroup) : "misc";
}

function copyAssets(outputPath: string): void {
  const reportDir = path.dirname(outputPath);

  const srcDir = path.resolve(process.cwd(), "tests", "test-report-generator", "assets");
  const destDir = path.join(reportDir, "assets");

  fs.cpSync(srcDir, destDir, { recursive: true });
}
