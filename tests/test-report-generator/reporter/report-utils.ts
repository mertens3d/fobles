import path from "node:path";
import stripAnsi from "strip-ansi";

export function formatStatus(status: string): string {
  return status === "timedOut"
    ? "Timed out"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripAnsiSafe(value: unknown): string {
  return stripAnsi(String(value));
}

export function toReportRelativeHref(
  attachmentPath: string,
  reportFile: string,
): string {
  const relative = path.relative(path.dirname(reportFile), attachmentPath);
  return relative.replace(/\\/g, "/");
}

export function toDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}
