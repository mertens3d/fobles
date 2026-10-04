import path from "node:path";

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
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function stripAnsi(value: unknown): string {
  return String(value).replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g,
    "",
  );
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
