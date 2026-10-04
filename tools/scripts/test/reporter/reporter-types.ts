import type { FullResult, TestResult } from "@playwright/test/reporter";

export type ReporterOptions = {
  outputFile?: string;
  autoOpenInBrowser?: boolean;
};

export type ReportStatus = TestResult["status"] | FullResult["status"] | "running";

export type ScreenshotInfo = {
  name: string;
  href: string;
};

export type NoteInfo = {
  name: string;
  text: string;
};

export type ReportStep = {
  title: string;
  status: "passed" | "failed";
  duration: number;
  error: string;
  screenshots?: ScreenshotInfo[];
  notes?: NoteInfo[];
};

export type ReportResult = {
  index: number;
  titlePath: string[];
  status: TestResult["status"];
  duration: number;
  error: string;
  steps: ReportStep[];
  screenshots: ScreenshotInfo[];
  notes: NoteInfo[];
};

export type CurrentFullResult = Pick<FullResult, "status"> | { status: "running" };
