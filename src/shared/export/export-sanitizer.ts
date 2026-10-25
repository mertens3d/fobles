// @source-path [fobles] src/shared/export/export-sanitizer.ts

import type { ExportSanitizationCounts, SanitizedExport } from "./export-sanitizer.types";

const REDACTED = "[REDACTED]";
const LOCAL_PATH = "[LOCAL_PATH]";
const SENSITIVE_QUERY_KEYS = new Set(["access_token", "authorization", "client_secret", "code", "id_token", "password", "refresh_token", "secret", "token"]);

function createCounts(): ExportSanitizationCounts {
  return { authorizationValues: 0, cookieValues: 0, credentialFields: 0, sensitiveQueryValues: 0, localWindowsPaths: 0 };
}

function replaceCounted(value: string, pattern: RegExp, replacement: string | ((substring: string, ...args: string[]) => string), onMatch: () => void): string {
  return value.replace(pattern, (...args) => {
    onMatch();
    return typeof replacement === "string" ? replacement : replacement(...args);
  });
}

export function sanitizeExportText(value: string): SanitizedExport {
  const counts = createCounts();
  let sanitized = value;

  sanitized = replaceCounted(sanitized, /\b(authorization\s*[:=]\s*)(?:bearer|basic)\s+[^\s,;"}]+/gi, (_match, prefix) => `${prefix}${REDACTED}`, () => { counts.authorizationValues += 1; });
  sanitized = replaceCounted(sanitized, /\b((?:set-)?cookie\s*[:=]\s*)[^\r\n]+/gi, (_match, prefix) => `${prefix}${REDACTED}`, () => { counts.cookieValues += 1; });
  sanitized = replaceCounted(sanitized, /(["']?(?:accessToken|access_token|refreshToken|refresh_token|idToken|id_token|clientSecret|client_secret|password|secret|apiKey|api_key)["']?\s*[:=]\s*["']?)([^\s,"'}&]+)/gi, (_match, prefix) => `${prefix}${REDACTED}`, () => { counts.credentialFields += 1; });
  sanitized = replaceCounted(sanitized, /\b[A-Za-z]:\\(?:[^\s\r\n"']+\\)*[^\s\r\n"']*/g, () => LOCAL_PATH, () => { counts.localWindowsPaths += 1; });
  sanitized = replaceCounted(sanitized, /([?&])([^=&#\s]+)=([^&#\s]*)/g, (match, separator, rawKey) => {
    const key = decodeURIComponent(rawKey).toLowerCase();
    if (!SENSITIVE_QUERY_KEYS.has(key)) return match;
    counts.sensitiveQueryValues += 1;
    return `${separator}${rawKey}=${encodeURIComponent(REDACTED)}`;
  }, () => {});

  return { value: sanitized, counts };
}

export function buildSanitizationReport(counts: ExportSanitizationCounts): string {
  const total = counts.authorizationValues + counts.cookieValues + counts.credentialFields + counts.sensitiveQueryValues + counts.localWindowsPaths;
  return [
    "Fobles Export Sanitization Report",
    "",
    `Total replacements: ${total}`,
    `Authorization values: ${counts.authorizationValues}`,
    `Cookie values: ${counts.cookieValues}`,
    `Credential fields: ${counts.credentialFields}`,
    `Sensitive query values: ${counts.sensitiveQueryValues}`,
    `Local Windows paths: ${counts.localWindowsPaths}`,
    "",
    "Preserved intentionally:",
    "- Sitecore item IDs and paths",
    "- Template IDs and paths",
    "- Worker, task and request IDs",
    "- Reference Model node IDs",
    "- Non-sensitive URL query values",
  ].join("\r\n");
}
