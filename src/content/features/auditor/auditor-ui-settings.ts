// @source-path [fobles] src/content/features/auditor/auditor-ui-settings.ts
const AUDITOR_CONTROLS_EXPANDED_KEY = "fobles.auditor.controls.expanded";
const DEFAULT_AUDITOR_CONTROLS_EXPANDED = true;

export async function getAuditorControlsExpanded(): Promise<boolean> {
  const values = await chrome.storage.local.get(AUDITOR_CONTROLS_EXPANDED_KEY);
  const stored = values[AUDITOR_CONTROLS_EXPANDED_KEY];
  return typeof stored === "boolean" ? stored : DEFAULT_AUDITOR_CONTROLS_EXPANDED;
}

export async function setAuditorControlsExpanded(expanded: boolean): Promise<void> {
  await chrome.storage.local.set({ [AUDITOR_CONTROLS_EXPANDED_KEY]: expanded });
}
