// @source-path [fobles] src/content/features/auditor/auditor-layout-view-settings.ts

export const AUDITOR_LAYOUT_VIEW_KEYS = ["device", "page-layout", "placeholder", "rendering", "datasource", "parameter"] as const;
export type AuditorLayoutViewKey = typeof AUDITOR_LAYOUT_VIEW_KEYS[number];
export type AuditorLayoutViewSettings = Readonly<Record<AuditorLayoutViewKey, boolean>>;

export const DEFAULT_AUDITOR_LAYOUT_VIEW_SETTINGS: AuditorLayoutViewSettings = {
  device: true,
  "page-layout": true,
  placeholder: true,
  rendering: true,
  datasource: true,
  parameter: true,
};

const STORAGE_KEY = "fobles.auditor.layout-view";
const EVENT_NAME = "fobles:auditor-layout-view-change";

export async function getAuditorLayoutViewSettings(): Promise<AuditorLayoutViewSettings> {
  const values = await chrome.storage.local.get(STORAGE_KEY);
  const stored: unknown = values[STORAGE_KEY];

  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return DEFAULT_AUDITOR_LAYOUT_VIEW_SETTINGS;

  const record = stored as Record<string, unknown>;
  return Object.fromEntries(AUDITOR_LAYOUT_VIEW_KEYS.map((key) => [key, typeof record[key] === "boolean" ? record[key] : true])) as AuditorLayoutViewSettings;
}

export async function setAuditorLayoutViewSettings(settings: AuditorLayoutViewSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  window.dispatchEvent(new CustomEvent<AuditorLayoutViewSettings>(EVENT_NAME, { detail: settings }));
}

export function subscribeAuditorLayoutViewSettings(listener: (settings: AuditorLayoutViewSettings) => void): () => void {
  const handleChange = (event: Event): void => listener((event as CustomEvent<AuditorLayoutViewSettings>).detail);
  window.addEventListener(EVENT_NAME, handleChange);
  return () => window.removeEventListener(EVENT_NAME, handleChange);
}
