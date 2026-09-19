import { SITECORE } from "./sitecore";
import { isPowerShellIsePath } from "./guard";

export function getPowerShellIseScriptTitle(doc: Document): string | null {
  const scriptName = doc
    .querySelector(SITECORE.SELECTORS.SCRIPT_NAME)
    ?.textContent
    ?.trim();
  return scriptName?.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

export function applyPowerShellIseTabIdentity(): void {
  if (!isPowerShellIsePath(window.location.pathname) || window.top !== window) {
    return;
  }

  const scriptTitle = getPowerShellIseScriptTitle(document);
  if (scriptTitle) document.title = scriptTitle;
}
