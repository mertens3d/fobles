export type MenuOption = {
  id: string;
  label: string;
  path?: string;
  url?: string;
  useCurrentItemId?: boolean;
  action?: (doc: Document) => void;
  icon?: string;
  // Hides the button entirely (e.g. not ready for use yet) without deleting its definition.
  isIncomplete?: boolean;
  isXPOnly?: boolean;
  isAIOnly?: boolean;
};

export type MenuGroup = {
  groupMembers: readonly MenuOption[];
  title?: string;
};

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

