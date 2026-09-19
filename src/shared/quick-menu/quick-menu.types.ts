// Persisted per-button customization, keyed by the button's stable GUID (see button-ids.ts).
export type QuickMenuButtonSetting = {
  // Snapshot of the button's label at save time, so raw storage is readable without cross-referencing code.
  label: string;
  enabled: boolean;
  pathSuffix: string;
};

export type QuickMenuButtonSettings = Record<string, QuickMenuButtonSetting>;

export type QuickMenuButtonDescriptor = {
  id: string;
  label: string;
  column: string;
  supportsPathSuffix: boolean;
  group?: string;
  basePath?: string;
};
