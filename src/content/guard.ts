import { type AllowedPage, FOBLES_PAGES } from "./constants";
import { SITECORE } from "./sitecore";

function normalizePath(pathname: string): string {
  let normalizedPath = pathname;
  try {
    normalizedPath = decodeURIComponent(pathname);
  } catch {
    // Keep the browser-provided pathname when it contains invalid escapes.
  }

  return normalizedPath.toLowerCase();
}

function toUrl(value: string | Location | URL, baseUrl?: string): URL | null {
  try {
    if (value instanceof URL) return value;
    if (typeof value !== "string") return new URL(value.href);
    return new URL(value, baseUrl ?? globalThis.location?.href);
  } catch {
    return null;
  }
}

// The page's own decoded, lowercased pathname + search - matchStrings (FOBLES_PAGES,
// src/content/constants.ts) are checked as plain substrings against this single string, whether
// they're really a path fragment or an "xmlcontrol=..." query fragment.
function normalizedHref(url: URL): string {
  const raw = `${url.pathname}${url.search}`;
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export function findAllowedPage(
  value: string | Location | URL,
  baseUrl?: string,
): AllowedPage | null {
  const url = toUrl(value, baseUrl);
  if (!url) return null;

  const href = normalizedHref(url);
  // A media request path can appear nested behind another page's path (e.g. Content Editor.aspx)
  // but is always a media resource, never a real shell page eligible for the toolbar.
  if (href.includes(SITECORE.RELATIVE_PATHS.MEDIA_REQUEST_SEGMENT.toLowerCase())) return null;

  return (
    FOBLES_PAGES.find(
      (page) =>
        page.eligible !== false &&
        page.matchStrings.some((matchString) => href.includes(matchString.toLowerCase())),
    ) ?? null
  );
}

export function isMenuPathAllowed(
  value: string | Location | URL,
  baseUrl?: string,
): boolean {
  return findAllowedPage(value, baseUrl) !== null;
}

export function isContentEditorPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.RELATIVE_PATHS.CONTENT_EDITOR.toLowerCase(),
  );
}

export function isMenuOwnedFrame(
  frame: HTMLIFrameElement | HTMLFrameElement,
): boolean {
  try {
    if (frame.contentWindow && isMenuPathAllowed(frame.contentWindow.location)) {
      return true;
    }
  } catch {
    // Fall back to the frame's resolved src when its location is inaccessible.
  }

  const src = frame.getAttribute("src");
  if (!src) return false;

  return isMenuPathAllowed(src, frame.ownerDocument.baseURI);
}

export function isPowerShellIsePath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.RELATIVE_PATHS.POWERSHELL_ISE.toLowerCase(),
  );
}

// Dialog/gallery pages with no room for the full toolbar (see FOBLES_PAGES's toolbarType,
// src/content/constants.ts) - gates injectToolbar's compact-vs-full layout (src/content/toolbar/
// index.ts).
export function isCompactToolbarPage(location: Location): boolean {
  return findAllowedPage(location)?.toolbarType === "compact";
}

export function isKickUsersPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.RELATIVE_PATHS.KICK_USERS.toLowerCase(),
  );
}