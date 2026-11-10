import { ReportGroup } from "./reporter.types";

export function getReportGroup(value: string): ReportGroup | undefined {
  const normalized = value.replace(/\\/g, "/");
  const testPath = /(?:^|\/)e2e\/([^/\s]+)(?:\/([^\s]+))?/.exec(normalized);
  const pathParts = testPath?.[2]?.split("/").filter(Boolean) ?? [];
  if (pathParts.length > 0 && /\.[^.]+$/.test(pathParts[pathParts.length - 1] ?? "")) {
    pathParts.pop();
  }
  const group = testPath
    ? { project: testPath[1], ...(pathParts.length > 0 ? { suite: pathParts.join("-") } : {}) }
    : undefined;
  const explicitProject = /(?:^|\s)--project(?:=|\s+)edge-([^\s]+)/.exec(normalized)?.[1];
  const result = group ?? (explicitProject ? { project: explicitProject } : undefined);

  return result;
}

export function reportGroupName(group: ReportGroup): string {
  return [group.project, group.suite && !/\.[^.]+$/.test(group.suite) ? group.suite : undefined]
    .filter((segment): segment is string => Boolean(segment))
    .join("-");
}
