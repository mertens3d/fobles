import type { CurrentFullResult, ReportResult } from "./reporter.types";

export type RenderReportInput = {
  outputFile: string;
  isCurrentReport: boolean;
  fullResult: CurrentFullResult;
  results: ReportResult[];
  startedAt: Date;
  totalTests: number;
  loginAlertUrl: string | null;
};
