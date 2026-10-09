import { type AllowedPage, FOBLES_PAGES } from "../constants/fobles.constants";
import { CONST} from "../constants/const";

function normalizePath(pathname: string): string {
  let normalizedPath = pathname;
  // try {
  //   normalizedPath = decodeURIComponent(pathname);
  // } catch {
  //   // Keep the browser-provided pathname when it contains invalid escapes.
  // }

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
function getNormalizedHref(url: URL): string {
  const raw = `${url.pathname}${url.search}`;
  // try {
  //   return decodeURIComponent(raw).toLowerCase();
  // } catch {
    return raw.toLowerCase();
  // }
}

function getNormalizedPath(path: string): string {
  return path.toLowerCase();
}

export function findAllowedPage(
  locationPath: string ,
  baseUrl?: string,
): AllowedPage | null {
  // const url = toUrl(locationPath, baseUrl);
  // if (!url) {
  //   return null;
  // }

  const normalizedHref = getNormalizedPath(locationPath);
  // A media request path can appear nested behind another page's path (e.g. Content Editor.aspx)
  // but is always a media resource, never a real shell page eligible for the toolbar.
  if (normalizedHref.includes(CONST.SITECORE.RELATIVE_PATHS_ENCODED.MEDIA_REQUEST_SEGMENT.toLowerCase())) return null;

  const result = 
    FOBLES_PAGES.find(
      (foblesPage) =>
        foblesPage.isFoblesEligible &&
        foblesPage.matchStrings.some((matchString) => {
          const normalizedMatchString = matchString.toLowerCase();
          return normalizedHref.includes(normalizedMatchString);
        }),
    ) ?? null;

    return result;
}

export function isMenuPathAllowed(
  locationPath: string ,
  baseUrl?: string,
): boolean {
  return findAllowedPage(locationPath, baseUrl) !== null;
}

export function isContentEditorPath(pathname: string): boolean {
  const normalizedPath = getNormalizedPath(pathname); 
  const result = 
   normalizedPath.includes(
    CONST.SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY.toLowerCase(),
  ) ||
  normalizedPath.includes(
    CONST.SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_MODERN.toLowerCase(),
  );
  return result;
}

export function isMenuOwnedFrame(
  frame: HTMLIFrameElement | HTMLFrameElement,
): boolean {
  try {
    if (frame.contentWindow && isMenuPathAllowed(frame.contentWindow.location.pathname)) {
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
  return getNormalizedPath(pathname).includes(
    CONST.SITECORE.RELATIVE_PATHS_ENCODED.POWERSHELL_ISE.toLowerCase(),
  );
}

// Dialog/gallery pages with no room for the full toolbar (see FOBLES_PAGES's toolbarType,
// src/content/constants.ts) - gates injectToolbar's compact-vs-full layout (src/content/toolbar/
// index.ts).
export function isCompactToolbarPage(locationPath: string , baseUrl?: string): boolean {
  return findAllowedPage(locationPath, baseUrl)?.toolbarType === "compact";
}

export function isKickUsersPath(pathname: string): boolean {
  return getNormalizedPath(pathname).includes(
    CONST.SITECORE.RELATIVE_PATHS_ENCODED.KICK_USERS.toLowerCase(),
  );
}