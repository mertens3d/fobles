import { SELECTORS } from "../constants";
import { isPowerShellIsePath } from "../menu-path";

function getPowerShellIseScriptTitle(): string | null {
  const scriptName = document
    .querySelector(SELECTORS.SITECORE_SCRIPT_NAME)
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
