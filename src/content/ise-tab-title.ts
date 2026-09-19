import { SITECORE } from "./sitecore";
import { isPowerShellIsePath } from "./guard";

function getPowerShellIseScriptTitle(): string | null {
  const scriptName = document
    .querySelector(SITECORE.SELECTORS.SCRIPT_NAME)
    ?.textContent
    ?.trim();
  return scriptName?.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

export function applyPowerShellIseTabIdentity(): void {
  if (!isPowerShellIsePath(window.location.pathname) || window.top !== window) {
    return;
  }

  const scriptTitle = getPowerShellIseScriptTitle();
  if (scriptTitle) document.title = scriptTitle;
}
