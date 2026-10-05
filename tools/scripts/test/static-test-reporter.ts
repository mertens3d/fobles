import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { matchAttachmentsToSteps } from "./reporter/attachment-matching";
import { openInBrowser, printStopSafelyWarning } from "./reporter/browser-utils";
import { renderReport } from "./reporter/report-renderer";
import type {
  CurrentFullResult,
  NoteInfo,
  ReporterOptions,
  ReportStep,
  ScreenshotInfo,
  ReportResult,
} from "./reporter/reporter-types";
import { stripAnsi, toReportRelativeHref } from "./reporter/report-utils";

function flattenSteps(steps: TestResult["steps"]): ReportStep[] {
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

export default class StaticTestReporter implements Reporter {
  private readonly outputFile: string;
  private readonly autoOpenInBrowser: boolean;
  private readonly startedAt: Date;
  private readonly resultsByFolder: Map<string, ReportResult[]>;
  private readonly css: string;
  private loginAlertUrl: string | null;
  private lastFullResult: CurrentFullResult;
  private totalTests: number;

  constructor(options: ReporterOptions = {}) {
    this.outputFile = path.resolve(
      options.outputFile ??
      path.resolve(
        process.cwd(),
        "tests",
        "test-artifacts",
        "reports",
        "test-report.html",
      ),
    );
    this.autoOpenInBrowser = options.autoOpenInBrowser ?? true;
    this.startedAt = new Date();
    this.resultsByFolder = new Map();
    this.loginAlertUrl = null;
    this.lastFullResult = { status: "running" };
    this.totalTests = 0;

    const cssPath = fileURLToPath(new URL("./reporter/report.css", import.meta.url));
    this.css = fs.readFileSync(cssPath, "utf8");
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.totalTests = suite.allTests().length;
    printStopSafelyWarning();
    this.writeReport({ status: "running" });
    if (this.autoOpenInBrowser) {
      openInBrowser(this.outputFile);
    }
  }

  onStdOut(chunk: string | Buffer): void {
    const text = chunk.toString();
    const loginMatch = text.match(/LOGIN NEEDED at (\S+)/);

    if (loginMatch) {
      this.loginAlertUrl = loginMatch[1];
      this.writeReport(this.lastFullResult);
    } else if (
      this.loginAlertUrl &&
      text.includes("[sitecore preflight] Looking for Fobles flyout")
    ) {
      this.loginAlertUrl = null;
      this.writeReport(this.lastFullResult);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    console.log("TEST ENDED");
    console.log(test.location.file);
    console.log(getFolderName(test));


    const screenshots: ScreenshotInfo[] = (result.attachments ?? [])
      .filter(
        (attachment) =>
          attachment.path && attachment.contentType?.startsWith("image/"),
      )
      .map((attachment) => ({
        name: attachment.name,
        href: toReportRelativeHref(attachment.path!, this.outputFile),
      }));

    const notes: NoteInfo[] = (result.attachments ?? [])
      .filter(
        (attachment) =>
          attachment.contentType === "text/plain" && attachment.body,
      )
      .map((attachment) => ({
        name: attachment.name,
        text: attachment.body!.toString("utf8"),
      }));

    console.log("**** Test Ended: ");
    for (const step of result.steps ?? []) {
      console.log(`step: ${step.title}`);
      for (const attachment of step.attachments ?? []) {
        console.log(`\t attachment: ${attachment.name} - ${attachment.path}`);
      }
    }
    const steps = flattenSteps(result.steps ?? []);
    const remainingScreenshots = matchAttachmentsToSteps(
      screenshots,
      steps,
      "screenshots",
    );
    const remainingNotes = matchAttachmentsToSteps(notes, steps, "notes");

    const folderName = getFolderName(test);

    if (!this.resultsByFolder.has(folderName)) {
      this.resultsByFolder.set(folderName, []);
    }

    const folderResults = this.resultsByFolder.get(folderName)!;

    const reportResult: ReportResult = {
      index: folderResults.length + 1,
      titlePath: test.titlePath(),
      status: result.status,
      duration: result.duration,
      error: stripAnsi(result.error?.message ?? ""),
      steps,
      screenshots: remainingScreenshots,
      notes: remainingNotes,
    };

    folderResults.push(reportResult);


    this.writeReport({ status: "running" });
  }

  onEnd(fullResult: FullResult): void {
    this.writeReport(fullResult);
  }

  private writeReport(fullResult: CurrentFullResult): void {
    this.lastFullResult = fullResult;

    const allResults = Array.from(
      this.resultsByFolder.values(),
    ).flat();


    console.log("-----------------Current results by folder:------------");
    console.log(
      [...this.resultsByFolder.keys()]
    );

    const liveHtml = renderReport({
      outputFile: this.outputFile,
      css: this.css,
      fullResult,
      results: allResults,
      startedAt: this.startedAt,
      totalTests: this.totalTests,
      loginAlertUrl: this.loginAlertUrl,
    });

    fs.writeFileSync(
      this.outputFile,
      liveHtml,
      "utf8",
    );

    for (const [folderName, results] of this.resultsByFolder) {
      const folderOutputFile = path.join(
        path.dirname(this.outputFile),
        `test-report-${folderName}.html`,
      );

      const html = renderReport({
        outputFile: folderOutputFile,
        css: this.css,
        fullResult,
        results,
        startedAt: this.startedAt,
        totalTests: results.length,
        loginAlertUrl: this.loginAlertUrl,
      });
      fs.mkdirSync(path.dirname(folderOutputFile), {
        recursive: true,
      });
      fs.writeFileSync(folderOutputFile, html, "utf8");
    }
    console.log("WRITE REPORT V4");
    console.log(`Static test report written to ${this.outputFile}`);
  }
}


function getFolderName(test: TestCase): string {
  const file = test.location.file.replace(/\\/g, "/");

  const match = file.match(/\/e2e\/([^/]+)\//);

  return match?.[1] ?? "misc";
}