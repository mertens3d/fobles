// @source-path [fobles] src/content/features/auditor/auditor-ui-settings.ts
import type { SitecoreHarvestFiltersState } from "../../foundation/harvesting/sitecore-harvester.types";

const AUDITOR_UI_KEY = {
  CONTROLS_EXPANDED: "fobles.auditor.controls.expanded",
  STATUS_FILTER: "fobles.auditor.filter.statuses",
  CHECK_FILTER: "fobles.auditor.filter.checks",
  GRAPH_FILTERS: "fobles.auditor.filter.graph",
} as const;
const DEFAULT_AUDITOR_CONTROLS_EXPANDED = true;

async function readStringArray(key: string): Promise<string[] | undefined> {
  const values = await chrome.storage.local.get(key);
  const stored: unknown = values[key];
  let result: string[] | undefined;
  if (Array.isArray(stored) && stored.every((value) => typeof value === "string")) result = stored;
  return result;
}

export async function getAuditorControlsExpanded(): Promise<boolean> {
  const values = await chrome.storage.local.get(AUDITOR_UI_KEY.CONTROLS_EXPANDED);
  const stored = values[AUDITOR_UI_KEY.CONTROLS_EXPANDED];
  return typeof stored === "boolean" ? stored : DEFAULT_AUDITOR_CONTROLS_EXPANDED;
}

export async function setAuditorControlsExpanded(expanded: boolean): Promise<void> {
  await chrome.storage.local.set({ [AUDITOR_UI_KEY.CONTROLS_EXPANDED]: expanded });
}

export async function getAuditorStatusFilter(): Promise<string[] | undefined> {
  return await readStringArray(AUDITOR_UI_KEY.STATUS_FILTER);
}

export async function setAuditorStatusFilter(statuses: readonly string[]): Promise<void> {
  await chrome.storage.local.set({ [AUDITOR_UI_KEY.STATUS_FILTER]: Array.from(statuses) });
}

export async function getAuditorCheckFilter(): Promise<string[] | undefined> {
  return await readStringArray(AUDITOR_UI_KEY.CHECK_FILTER);
}

export async function setAuditorCheckFilter(checkKeys: readonly string[]): Promise<void> {
  await chrome.storage.local.set({ [AUDITOR_UI_KEY.CHECK_FILTER]: Array.from(checkKeys) });
}

export async function getAuditorGraphFilters(): Promise<Partial<SitecoreHarvestFiltersState> | undefined> {
  const values = await chrome.storage.local.get(AUDITOR_UI_KEY.GRAPH_FILTERS);
  const stored: unknown = values[AUDITOR_UI_KEY.GRAPH_FILTERS];
  let result: Partial<SitecoreHarvestFiltersState> | undefined;
  if (stored && typeof stored === "object" && !Array.isArray(stored)) result = stored as Partial<SitecoreHarvestFiltersState>;
  return result;
}

export async function setAuditorGraphFilters(filters: SitecoreHarvestFiltersState): Promise<void> {
  await chrome.storage.local.set({ [AUDITOR_UI_KEY.GRAPH_FILTERS]: filters });
}
