import { SITECORE } from "./constants";

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
  if (
    SITECORE.MENU_PATHS.some((allowedPath) =>
      path.includes(allowedPath.toLowerCase()),
    )
  ) return true;

  if (path !== SITECORE.SHELL_DEFAULT_PATH.toLowerCase()) return false;

  const xmlControl = url.searchParams
    .get(SITECORE.XML_CONTROL_QUERY_PARAMETER)
    ?.trim();
  if (!xmlControl) return false;

  return SITECORE.ALLOWED_XML_CONTROLS.some(
    (allowedControl) => allowedControl.toLowerCase() === xmlControl.toLowerCase(),
  );
}

export function isContentEditorPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.CONTENT_EDITOR_PATH.toLowerCase(),
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
    SITECORE.POWERSHELL_ISE_PATH.toLowerCase(),
  );
}

export function isFieldEditorDialogPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.FIELD_EDITOR_PATH.toLowerCase(),
  );
}

export function isSelectRenderingDialog(location: Location): boolean {
  const url = new URL(location.href);
  return normalizePath(location.pathname) === SITECORE.SHELL_DEFAULT_PATH &&
    url.searchParams.get(SITECORE.XML_CONTROL_QUERY_PARAMETER) ===
      SITECORE.SELECT_RENDERING_XML_CONTROL;
}

export function isKickUsersPath(pathname: string): boolean {
  return normalizePath(pathname).includes(
    SITECORE.KICK_USERS_PATH.toLowerCase(),
  );
}