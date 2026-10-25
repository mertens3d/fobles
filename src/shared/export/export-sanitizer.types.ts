// @source-path [fobles] src/shared/export/export-sanitizer.types.ts

export type ExportSanitizationCounts = {
  authorizationValues: number;
  cookieValues: number;
  credentialFields: number;
  sensitiveQueryValues: number;
  localWindowsPaths: number;
};

export type SanitizedExport = {
  readonly value: string;
  readonly counts: ExportSanitizationCounts;
};
