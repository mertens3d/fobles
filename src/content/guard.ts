import { ALLOWED_PATHS, ALLOWED_XML_CONTROLS, COMPACT_TOOLBAR_XML_CONTROLS } from "./constants";
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

export function isMenuPathAllowed(
  value: string | Location | URL,
  baseUrl?: string,
): boolean {
  const url = toUrl(value, baseUrl);
  if (!url) return false;

  const path = normalizePath(url.pathname);
  // A media request path can appear nested behind another page's path (e.g. Content Editor.aspx)
  // but is always a media resource, never a real shell page eligible for the toolbar.
  if (path.includes(SITECORE.RELATIVE_PATHS.MEDIA_REQUEST_SEGMENT.toLowerCase())) return false;

  if (
    ALLOWED_PATHS.some((allowedPath) =>
      path.includes(allowedPath.toLowerCase()),
    )
  ) return true;

  if (path !== SITECORE.RELATIVE_PATHS.SHELL_DEFAULT.toLowerCase()) return false;

  const xmlControl = url.searchParams
    .get(SITECORE.QUERY_PARAMS.XML_CONTROL)
    ?.trim();
  if (!xmlControl) return false;

  return ALLOWED_XML_CONTROLS.some(
    (allowedControl) => allowedControl.toLowerCase() === xmlControl.toLowerCase(),
  );
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

function hasXmlControl(location: Location, xmlControl: string): boolean {
  const url = new URL(location.href);
  return normalizePath(location.pathname) === SITECORE.RELATIVE_PATHS.SHELL_DEFAULT &&
    url.searchParams.get(SITECORE.QUERY_PARAMS.XML_CONTROL) === xmlControl;
}

export function isSelectRenderingDialog(location: Location): boolean {
  return hasXmlControl(location, SITECORE.XML_CONTROLS.SELECT_RENDERING);
}

// Dialog/gallery xmlcontrol pages with no room for the full toolbar (see
// COMPACT_TOOLBAR_XML_CONTROLS, src/content/constants.ts) - gates injectToolbar's
// compact-vs-full layout (src/content/toolbar/index.ts).
export function isCompactToolbarPage(location: Location): boolean {
  return COMPACT_TOOLBAR_XML_CONTROLS.some((xmlControl) => hasXmlControl(location, xmlControl));
}

export function isKickUsersPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.RELATIVE_PATHS.KICK_USERS.toLowerCase(),
  );
}